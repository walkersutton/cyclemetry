/// Scene orchestration: builds caches, drives the frame loop, pipes to FFmpeg.
///
/// Optimization layout:
///   - One-time: parse GPX, interpolate, smooth, build chart/font caches, pre-render base frame
///   - Per-frame: blit base + chart marker + dynamic text → pipe raw RGBA to FFmpeg stdin
///   - Frame loop: producer thread renders rayon parallel chunks and sends frames through a
///     bounded channel; consumer (main thread) drains to FFmpeg stdin concurrently so render
///     and encode overlap instead of running back-to-back.
use rayon::prelude::*;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::render::activity::Activity;
use crate::render::frame::{render_frame, SceneCache};
use crate::render::template::Template;

pub struct RenderProgress {
    pub frames_rendered: Arc<AtomicU64>,
    pub total_frames: Arc<AtomicU64>,
    pub cancelled: Arc<AtomicBool>,
}

impl RenderProgress {
    pub fn new() -> Self {
        RenderProgress {
            frames_rendered: Arc::new(AtomicU64::new(0)),
            total_frames: Arc::new(AtomicU64::new(0)),
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn snapshot(&self) -> (u64, u64) {
        (
            self.frames_rendered.load(Ordering::Relaxed),
            self.total_frames.load(Ordering::Relaxed),
        )
    }

    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::Relaxed);
    }
}

/// Full video render pipeline.
pub fn render_video(
    gpx_path: &str,
    template: &Template,
    output_path: &str,
    fonts_dir: &str,
    progress: &RenderProgress,
) -> Result<(), String> {
    // Clear any stale cancel flag from a previous render that may have raced
    // with this call between NativeRenderState::new() and spawn_blocking starting.
    progress
        .cancelled
        .store(false, std::sync::atomic::Ordering::SeqCst);

    // --- Load and prepare activity data ---
    let mut activity = Activity::from_gpx(gpx_path)?;
    activity.interpolate(template.scene.fps);

    // scene.start/end are in seconds; convert to frame indices before trimming.
    let fps = template.scene.fps as usize;
    let start_frame = template.scene.start.unwrap_or(0) * fps;
    if let Some(end_secs) = template.scene.end {
        let end_frame = (end_secs * fps).min(activity.data_len());
        if end_frame > start_frame {
            activity.trim(start_frame, end_frame)?;
        }
    } else if start_frame > 0 {
        activity.trim(start_frame, activity.data_len())?;
    }

    let total_frames = activity.data_len();
    progress
        .total_frames
        .store(total_frames as u64, Ordering::Relaxed);

    // --- Build caches ---
    let cache = SceneCache::build(&activity, template, fonts_dir)
        .map_err(|e| format!("Cache build failed: {e}"))?;

    // Ensure even dimensions (codec requirement)
    let w = (cache.width + 1) & !1;
    let h = (cache.height + 1) & !1;

    // --- Spawn FFmpeg ---
    let ffmpeg_bin = resolve_ffmpeg();
    log::info!("render_video: spawning FFmpeg from {ffmpeg_bin}");
    let mut ffmpeg = Command::new(&ffmpeg_bin)
        .args([
            "-loglevel",
            "warning",
            "-f",
            "rawvideo",
            // Skia renders BGRA8888 natively; feeding bgra means FFmpeg does
            // zero per-frame swscale conversion before the encoder.
            "-pix_fmt",
            "bgra",
            "-s",
            &format!("{w}x{h}"),
            "-r",
            &template.scene.fps.to_string(),
            "-i",
            "-",
            "-c:v",
            "prores_videotoolbox",
            "-profile:v",
            "4444",
            // No forced output pix_fmt: videotoolbox negotiates ProRes 4444's
            // internal format from bgra on the encoder (HW), keeping alpha,
            // instead of an 8→16-bit CPU upconvert that gained no quality.
            "-y",
            output_path,
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg ({ffmpeg_bin}): {e}"))?;

    let mut stdin = ffmpeg.stdin.take().unwrap();
    log::info!("render_video: FFmpeg spawned (PID {})", ffmpeg.id());

    // Drain stderr in a background thread to prevent pipe-buffer deadlock during
    // finalization: FFmpeg flushes encoder + writes moov atom and may emit >65 KB
    // of progress/stats to stderr. If we only read it after ffmpeg.wait(), the pipe
    // fills, FFmpeg blocks, and wait() deadlocks.
    // Log each stderr line as it arrives so finalization issues are visible in real time.
    // Collecting into Vec<String> lets us surface the last lines on failure.
    let stderr_drainer = ffmpeg.stderr.take().map(|stderr| {
        std::thread::spawn(move || -> Vec<String> {
            use std::io::BufRead;
            let mut lines = Vec::new();
            for line in std::io::BufReader::new(stderr)
                .lines()
                .map_while(Result::ok)
            {
                log::warn!("ffmpeg: {line}");
                lines.push(line);
            }
            lines
        })
    });

    // --- Pipelined frame loop ---
    // Layout: producer renders rayon chunks → bounded channel → consumer writes to FFmpeg stdin.
    // Consumer runs in its own thread so the main scope thread can act as a cancel watchdog:
    // when cancelled, the watchdog kills FFmpeg, which breaks the stdin pipe and causes the
    // consumer's write_all to return EPIPE immediately — no more stuck write_all on disk I/O.
    let num_threads = rayon::current_num_threads();
    let chunk_size = (num_threads * 2).max(8);
    log::info!(
        "render_video: {total_frames} frames, {num_threads} rayon threads, chunk_size={chunk_size}"
    );

    let pipeline_start = Instant::now();

    // thread::scope guarantees all spawned threads finish before the scope exits,
    // allowing safe borrows of `cache`, `activity`, `template`, and `progress`.
    let scope_result: Result<(Duration, Duration), String> = std::thread::scope(|s| {
        // tx/rx are created INSIDE the scope so the producer can take ownership of tx.
        // With `move ||`, when producer exits it drops tx, which disconnects the channel
        // and lets consumer's rx.recv() return Err — without this, tx would live in the
        // outer function and rx.recv() would block forever after all frames are queued.
        let (tx, rx) = std::sync::mpsc::sync_channel::<Vec<u8>>(chunk_size);

        let cancelled = &progress.cancelled;

        let producer = s.spawn(move || -> (bool, Duration) {
            let mut sent = 0usize;
            let mut total_render = Duration::ZERO;
            while sent < total_frames {
                if cancelled.load(Ordering::Relaxed) {
                    return (true, total_render);
                }
                let chunk_end = (sent + chunk_size).min(total_frames);
                let t0 = Instant::now();
                let frames: Vec<Vec<u8>> = (sent..chunk_end)
                    .into_par_iter()
                    .map(|i| render_frame(i, &cache, &activity, template))
                    .collect();
                let render_elapsed = t0.elapsed();
                total_render += render_elapsed;
                log::debug!(
                    "chunk {sent}..{chunk_end}: render={:.0}ms",
                    render_elapsed.as_secs_f64() * 1000.0,
                );
                for frame in frames {
                    if tx.send(frame).is_err() {
                        return (false, total_render); // consumer stopped (error or cancel)
                    }
                    sent += 1;
                }
            }
            (false, total_render)
        });

        // Consumer thread: drain frames from the channel and write to FFmpeg stdin.
        // stdin is moved in so the pipe closes (EOF) when this thread exits.
        // O_NONBLOCK is set on the fd so write() returns WouldBlock instead of
        // blocking indefinitely when the pipe buffer is full (disk I/O bottleneck).
        // This lets us check the cancel flag on every 1ms retry, guaranteeing
        // cancel latency ≤ ~2ms regardless of disk speed.
        let cancelled_consumer = Arc::clone(&progress.cancelled);
        let frames_counter = Arc::clone(&progress.frames_rendered);
        let consumer = s.spawn(move || -> (Option<String>, Duration) {
            use std::io::Write as _;
            use std::os::unix::io::AsRawFd;
            unsafe {
                let fd = stdin.as_raw_fd();
                let flags = libc::fcntl(fd, libc::F_GETFL, 0);
                libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK);
            }

            let drain_start = Instant::now();
            let mut frame_idx = 0usize;
            let mut consumer_err: Option<String> = None;
            let mut last_write_log = Instant::now();

            'outer: while let Ok(data) = rx.recv() {
                if last_write_log.elapsed() >= Duration::from_secs(5) {
                    log::info!(
                        "consumer: writing frame {frame_idx}/{total_frames} \
                         ({:.0}s elapsed)",
                        drain_start.elapsed().as_secs_f64()
                    );
                    last_write_log = Instant::now();
                }
                let mut offset = 0usize;
                loop {
                    if cancelled_consumer.load(Ordering::Relaxed) {
                        break 'outer;
                    }
                    if offset >= data.len() {
                        break;
                    }
                    match stdin.write(&data[offset..]) {
                        Ok(0) => break,
                        Ok(n) => offset += n,
                        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            std::thread::sleep(Duration::from_millis(1));
                        }
                        Err(e) => {
                            // EPIPE = FFmpeg killed by cancel watchdog; silent exit.
                            let msg = e.to_string();
                            if !msg.contains("Broken pipe") && !msg.contains("os error 32") {
                                consumer_err =
                                    Some(format!("FFmpeg pipe error at frame {frame_idx}: {e}"));
                            }
                            break 'outer;
                        }
                    }
                }
                frame_idx += 1;
                frames_counter.store(frame_idx as u64, Ordering::Relaxed);
            }
            let total_drain = drain_start.elapsed();
            log::info!(
                "consumer: done — {frame_idx} frames in {:.1}s",
                total_drain.as_secs_f64()
            );
            (consumer_err, total_drain)
        });

        // Cancel watchdog: poll the cancel flag every 10ms.
        // When cancelled, kill FFmpeg — this breaks the stdin pipe so the consumer's
        // write_all returns EPIPE immediately instead of blocking until disk I/O drains.
        loop {
            if cancelled.load(Ordering::Relaxed) {
                log::info!("render_video: cancel detected in watchdog — killing FFmpeg");
                let _ = ffmpeg.kill();
                break;
            }
            if consumer.is_finished() {
                break;
            }
            std::thread::sleep(Duration::from_millis(10));
        }

        let (consumer_err, total_drain) = consumer.join().expect("render consumer panicked");
        let (was_cancelled, total_render) = producer.join().expect("render producer panicked");

        if let Some(e) = consumer_err {
            return Err(e);
        }
        if was_cancelled || cancelled.load(Ordering::Relaxed) {
            return Err("Render cancelled".to_string());
        }
        Ok((total_render, total_drain))
    });

    log::info!("render_video: scope exited — stdin EOF sent, awaiting FFmpeg");

    let (total_render_time, total_drain_time) = match scope_result {
        Ok(t) => t,
        Err(e) => {
            let _ = ffmpeg.kill();
            let _ = ffmpeg.wait();
            // Collect FFmpeg stderr now — it explains why the scope failed (e.g. startup crash).
            let stderr_lines = stderr_drainer
                .and_then(|t| t.join().ok())
                .unwrap_or_default();
            if std::path::Path::new(output_path).exists() {
                let _ = std::fs::remove_file(output_path);
            }
            return if stderr_lines.is_empty() {
                Err(e)
            } else {
                Err(format!("{e}\nFFmpeg: {}", stderr_lines.join("\n")))
            };
        }
    };

    let total_elapsed = pipeline_start.elapsed();
    let fps_actual = total_frames as f64 / total_elapsed.as_secs_f64();
    log::info!(
        "render_video done: {total_frames} frames in {:.1}s @ {fps_actual:.1} fps  \
         | render {:.1}s ({:.1}ms/frame)  \
         | drain(encode) {:.1}s ({:.1}ms/frame)  \
         | overlap savings {:.1}s",
        total_elapsed.as_secs_f64(),
        total_render_time.as_secs_f64(),
        total_render_time.as_secs_f64() * 1000.0 / total_frames as f64,
        total_drain_time.as_secs_f64(),
        total_drain_time.as_secs_f64() * 1000.0 / total_frames as f64,
        (total_render_time + total_drain_time)
            .saturating_sub(total_elapsed)
            .as_secs_f64(),
    );

    // Poll FFmpeg exit while respecting mid-finalization cancel requests.
    // ffmpeg.wait() would block until FFmpeg exits with no cancel escape hatch;
    // try_wait() lets us interleave a cancel check every 50 ms.
    let finalize_start = Instant::now();
    log::info!("render_video: finalization started (FFmpeg mux/write)");
    let mut last_heartbeat = Instant::now();
    let status = loop {
        if progress.cancelled.load(Ordering::Relaxed) {
            log::info!("render_video: cancelled during finalization — killing FFmpeg");
            let _ = ffmpeg.kill();
            let _ = ffmpeg.wait();
            let _ = stderr_drainer.map(|t| t.join());
            if std::path::Path::new(output_path).exists() {
                let _ = std::fs::remove_file(output_path);
            }
            return Err("Render cancelled".to_string());
        }
        if last_heartbeat.elapsed() >= Duration::from_secs(5) {
            log::info!(
                "render_video: still finalizing… {:.1}s elapsed",
                finalize_start.elapsed().as_secs_f64()
            );
            last_heartbeat = Instant::now();
        }
        match ffmpeg
            .try_wait()
            .map_err(|e| format!("FFmpeg wait error: {e}"))?
        {
            Some(status) => break status,
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    };
    log::info!(
        "render_video: finalization done in {:.1}s",
        finalize_start.elapsed().as_secs_f64()
    );

    let ffmpeg_stderr_lines = stderr_drainer
        .and_then(|t| t.join().ok())
        .unwrap_or_default();

    if !status.success() {
        let ffmpeg_stderr = ffmpeg_stderr_lines.join("\n");
        if std::path::Path::new(output_path).exists() {
            let _ = std::fs::remove_file(output_path);
        }
        return Err(if ffmpeg_stderr.is_empty() {
            format!("FFmpeg failed ({})", status)
        } else {
            format!("FFmpeg failed ({}): {ffmpeg_stderr}", status)
        });
    }

    let frames_written = progress.frames_rendered.load(Ordering::Relaxed);
    if frames_written == 0 {
        if std::path::Path::new(output_path).exists() {
            let _ = std::fs::remove_file(output_path);
        }
        return Err(format!(
            "Render produced no output ({total_frames} frames expected). \
             FFmpeg may be missing — install it via Homebrew: brew install ffmpeg"
        ));
    }

    Ok(())
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn resolve_ffmpeg() -> String {
    if let Ok(exe) = std::env::current_exe() {
        // Dev: {repo}/resources/ffmpeg (skip zero-byte build stub)
        if let Some(root) = exe.ancestors().find(|p| p.join("resources").exists()) {
            let dev = root.join("resources").join("ffmpeg");
            if std::fs::metadata(&dev)
                .map(|m| m.len() > 0)
                .unwrap_or(false)
            {
                ensure_executable(&dev);
                return dev.to_string_lossy().to_string();
            }
        }
        // Production macOS .app: exe is Contents/MacOS/cyclemetry,
        // Tauri resources land at Contents/Resources/
        if let Some(contents) = exe.parent().and_then(|p| p.parent()) {
            let bundled = contents.join("Resources").join("ffmpeg");
            if std::fs::metadata(&bundled)
                .map(|m| m.len() > 0)
                .unwrap_or(false)
            {
                ensure_executable(&bundled);
                return bundled.to_string_lossy().to_string();
            }
        }
    }
    // Homebrew on macOS doesn't modify the system PATH visible to .app bundles.
    // Check known install locations before falling back to PATH lookup.
    for candidate in &[
        "/opt/homebrew/bin/ffmpeg", // Apple Silicon Homebrew
        "/usr/local/bin/ffmpeg",    // Intel Homebrew
    ] {
        let p = std::path::Path::new(candidate);
        if std::fs::metadata(p).map(|m| m.len() > 0).unwrap_or(false) {
            log::info!("resolve_ffmpeg: using Homebrew ffmpeg at {candidate}");
            return candidate.to_string();
        }
    }

    log::warn!("resolve_ffmpeg: no ffmpeg found — falling back to PATH lookup");
    "ffmpeg".to_string()
}

fn ensure_executable(path: &std::path::Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(path) {
            let mut perms = meta.permissions();
            if perms.mode() & 0o111 == 0 {
                perms.set_mode(perms.mode() | 0o755);
                let _ = std::fs::set_permissions(path, perms);
            }
        }
    }
}
