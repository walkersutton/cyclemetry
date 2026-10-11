fn main() {
    println!("cargo:rerun-if-env-changed=CYCLEMETRY_BUILD_STAMP");

    // Ensure resources/ffmpeg exists so tauri_build can validate bundle resources.
    // In CI, the real binary is placed here before `pnpm build`. Locally, this
    // stub lets `cargo check`/`pnpm dev` compile; resolve_ffmpeg() skips zero-byte
    // files and falls through to the system ffmpeg on PATH.
    let ffmpeg_stub = std::path::Path::new("../resources/ffmpeg");
    if !ffmpeg_stub.exists() {
        let _ = std::fs::write(ffmpeg_stub, b"");
    }
    // Windows uses tauri.windows.conf.json which bundles ffmpeg.exe instead.
    let ffmpeg_exe_stub = std::path::Path::new("../resources/ffmpeg.exe");
    if !ffmpeg_exe_stub.exists() {
        let _ = std::fs::write(ffmpeg_exe_stub, b"");
    }

    tauri_build::build();
    // Bake a Unix timestamp so every build has a unique, visible identifier.
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    println!("cargo:rustc-env=CYCLEMETRY_BUILD_TIME={secs}");
}
