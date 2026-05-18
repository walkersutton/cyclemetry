mod recent;
mod render;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::Manager;

// ─── Path helpers ─────────────────────────────────────────────────────────────

/// Per-user writable data root: `~/Library/Application Support/com.cyclemetry/`.
/// Resolved once from Tauri's `app_data_dir()` in `setup()`. Persists across
/// app updates (unlike the bundle) and reboots (unlike `/tmp`).
static APP_DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

fn app_data_base() -> PathBuf {
    APP_DATA_DIR
        .get()
        .cloned()
        .unwrap_or_else(|| std::env::temp_dir().join("cyclemetry"))
}

/// Where opened/uploaded GPX activities are stored.
fn uploads_dir() -> PathBuf {
    let dir = app_data_base().join("uploads");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// User-editable templates directory (created + installed community templates).
fn templates_user_dir() -> PathBuf {
    let dir = app_data_base().join("templates");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// User-installed custom fonts directory. Checked by the renderer (via
/// `load_typeface`) and listed alongside bundled fonts.
fn fonts_user_dir() -> PathBuf {
    let dir = app_data_base().join("fonts");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// ~/Movies/Cyclemetry/ — default render output destination.
fn default_output_dir() -> PathBuf {
    let dir = std::env::var("HOME")
        .map(|h| PathBuf::from(h).join("Movies").join("Cyclemetry"))
        .unwrap_or_else(|_| PathBuf::from("/tmp/cyclemetry/output"));
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn template_display_name(s: &str) -> String {
    s.replace('_', " ")
        .split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().to_string() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Read a JPG into a base64 `data:` URL value, or `None` if it doesn't exist.
fn jpg_data_url(path: &Path) -> Option<serde_json::Value> {
    if !path.exists() {
        return None;
    }
    use base64::Engine;
    std::fs::read(path).ok().map(|bytes| {
        let enc = base64::engine::general_purpose::STANDARD.encode(&bytes);
        serde_json::Value::String(format!("data:image/jpeg;base64,{enc}"))
    })
}

/// Resolve a template's preview image.
/// 1. User-saved preview next to the json (`{user_dir}/{base}.jpg`).
/// 2. Dev: the repo's `templates/{base}/preview.jpg` (inlined as a data URL).
/// 3. Release: the GitHub raw URL for the bundled template preview.
fn resolve_preview_value(user_dir: &Path, base: &str) -> serde_json::Value {
    if let Some(v) = jpg_data_url(&user_dir.join(format!("{base}.jpg"))) {
        return v;
    }
    #[cfg(debug_assertions)]
    {
        jpg_data_url(&repo_templates_dir().join(base).join("preview.jpg"))
            .unwrap_or(serde_json::Value::Null)
    }
    #[cfg(not(debug_assertions))]
    {
        serde_json::Value::String(format!("{GITHUB_RAW_TEMPLATES}/{base}/preview.jpg"))
    }
}

// ─── GPX path resolution ──────────────────────────────────────────────────────

/// Resolve a bare GPX filename to an absolute path.
/// Order: absolute path → prod uploads → dev uploads → dev backend → exe dir → demo fallback.
fn resolve_gpx_path(gpx_filename: &str) -> Result<(String, Option<String>), String> {
    let p = Path::new(gpx_filename);
    if p.is_absolute() && p.exists() {
        return Ok((gpx_filename.to_string(), None));
    }

    let basename = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(gpx_filename);

    let prod = format!("/tmp/cyclemetry/uploads/{}", basename);
    if Path::new(&prod).exists() {
        return Ok((prod, None));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().find(|p| p.join("backend").exists()) {
            let dev_upload = root.join("backend").join("uploads").join(basename);
            if dev_upload.exists() {
                return Ok((dev_upload.to_string_lossy().to_string(), None));
            }
            let dev_root = root.join("backend").join(basename);
            if dev_root.exists() {
                return Ok((dev_root.to_string_lossy().to_string(), None));
            }
        }
        if let Some(parent) = exe.parent() {
            let bundled = parent.join(basename);
            if bundled.exists() {
                return Ok((bundled.to_string_lossy().to_string(), None));
            }
        }
    }

    if let Some(demo) = resolve_demo_gpx() {
        let warning = format!(
            "GPX '{}' not found — showing demo activity instead",
            basename
        );
        log::warn!("{warning}");
        return Ok((demo, Some(warning)));
    }

    Err(format!("GPX file not found: {gpx_filename}"))
}

fn resolve_demo_gpx() -> Option<String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            for name in &["demo.gpxinit", "demo.gpx"] {
                let p = parent.join(name);
                if p.exists() {
                    return Some(p.to_string_lossy().to_string());
                }
            }
        }
        if let Some(root) = exe.ancestors().find(|p| p.join("backend").exists()) {
            let p = root.join("backend").join("demo.gpxinit");
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
        }
    }
    None
}

fn resolve_fonts_dir() -> String {
    if let Ok(exe) = std::env::current_exe() {
        // Dev: repo resources/fonts/
        if let Some(root) = exe.ancestors().find(|p| p.join("resources").exists()) {
            let dev = root.join("resources").join("fonts");
            if dev.exists() {
                return dev.to_string_lossy().to_string();
            }
        }
        // Production macOS .app bundle: Contents/Resources/fonts/
        if let Some(contents) = exe.parent().and_then(|p| p.parent()) {
            let prod = contents.join("Resources").join("fonts");
            if prod.exists() {
                return prod.to_string_lossy().to_string();
            }
        }
    }
    "./fonts".to_string()
}

fn resolve_output_path(template_json: &serde_json::Value, output_dir: Option<&str>) -> String {
    let stem = template_json
        .pointer("/scene/overlay_filename")
        .and_then(|v| v.as_str())
        .unwrap_or("overlay")
        .trim_end_matches(".mov");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let (y, mo, d, h, mi) = unix_to_ymdhm(now);
    let filename = format!("{stem}_{y}{mo:02}{d:02}_{h:02}{mi:02}.mov");

    let dir = match output_dir {
        Some(d) if !d.is_empty() => {
            let p = PathBuf::from(d);
            std::fs::create_dir_all(&p).ok();
            p
        }
        _ => default_output_dir(),
    };
    format!("{}/{}", dir.to_string_lossy(), filename)
}

fn unix_to_ymdhm(secs: u64) -> (u64, u64, u64, u64, u64) {
    let mi = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400;
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let mo = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if mo <= 2 { y + 1 } else { y };
    (y, mo, d, h, mi)
}

// ─── Build info ───────────────────────────────────────────────────────────────

#[tauri::command]
fn app_build_info() -> String {
    let ts: u64 = env!("CYCLEMETRY_BUILD_TIME").parse().unwrap_or(0);
    let (y, mo, d, h, mi) = unix_to_ymdhm(ts);
    format!("build {y}-{mo:02}-{d:02} {h:02}:{mi:02} UTC")
}

// ─── Template commands ────────────────────────────────────────────────────────

#[tauri::command]
fn backend_list_templates() -> Result<String, String> {
    let mut templates: Vec<serde_json::Value> = Vec::new();
    let dir = templates_user_dir();
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Ok("[]".to_string());
    };
    for entry in entries.flatten() {
        let Ok(ftype) = entry.file_type() else {
            continue;
        };
        let name_os = entry.file_name();
        let name = name_os.to_string_lossy();
        if ftype.is_file() && name.ends_with(".json") {
            let fname = name.to_string();
            let display = template_display_name(fname.trim_end_matches(".json"));
            let sidecar = dir.join(format!("{fname}.remote"));
            let type_label = if sidecar.exists() {
                let current = std::fs::read_to_string(dir.join(&fname)).unwrap_or_default();
                let reference = std::fs::read_to_string(&sidecar).unwrap_or_default();
                if current.trim() == reference.trim() {
                    "community"
                } else {
                    "community-modified"
                }
            } else {
                "user"
            };
            let base = fname.trim_end_matches(".json");
            let preview_url = resolve_preview_value(&dir, base);
            templates.push(serde_json::json!({
                "id": fname,
                "name": display,
                "type": type_label,
                "preview_url": preview_url
            }));
        }
    }
    Ok(serde_json::to_string(&templates).unwrap_or_else(|_| "[]".to_string()))
}

#[tauri::command]
fn backend_get_template(filename: String) -> Result<String, String> {
    let rel = validate_template_path(&filename)?;
    let path = templates_user_dir().join(&rel);
    if !path.exists() {
        return Err(format!("Template not found: {filename}"));
    }
    let contents =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read template: {e}"))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&contents).map_err(|e| format!("Invalid template JSON: {e}"))?;
    serde_json::to_string(&parsed).map_err(|e| e.to_string())
}

#[tauri::command]
fn backend_save_template(config: serde_json::Value, filename: String) -> Result<String, String> {
    let rel = validate_template_path(&filename)?;
    let path = templates_user_dir().join(&rel);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {e}"))?;
    }
    let pretty =
        serde_json::to_string_pretty(&config).map_err(|e| format!("Serialize error: {e}"))?;
    std::fs::write(&path, &pretty).map_err(|e| format!("Failed to write template: {e}"))?;
    Ok(
        serde_json::json!({ "message": format!("Template saved to {rel}"), "filename": rel })
            .to_string(),
    )
}

/// Validate a template path: at most `folder/file.json`, no `..`, must end with `.json`.
fn validate_template_path(filename: &str) -> Result<String, String> {
    let parts: Vec<&str> = filename.splitn(3, '/').collect();
    match parts.as_slice() {
        [file] if file.ends_with(".json") && !file.contains("..") => Ok(file.to_string()),
        [dir, file] if file.ends_with(".json") && !dir.contains("..") && !file.contains("..") => {
            Ok(format!("{dir}/{file}"))
        }
        _ => Err("Invalid template path".to_string()),
    }
}

// ─── Delete / preview commands ───────────────────────────────────────────────

#[tauri::command]
fn backend_delete_template(filename: String) -> Result<String, String> {
    let rel = validate_template_path(&filename)?;
    let user_dir = templates_user_dir();
    let path = user_dir.join(&rel);
    if !path.exists() {
        return Err(format!("Template not found in user templates: {filename}"));
    }
    std::fs::remove_file(&path).map_err(|e| format!("Failed to delete template: {e}"))?;
    let base = rel.trim_end_matches(".json");
    let sidecar = user_dir.join(format!("{base}.json.remote"));
    if sidecar.exists() {
        std::fs::remove_file(&sidecar).ok();
    }
    let preview = user_dir.join(format!("{base}.jpg"));
    if preview.exists() {
        std::fs::remove_file(&preview).ok();
    }
    Ok(serde_json::json!({ "message": format!("Deleted {filename}") }).to_string())
}

#[tauri::command]
fn backend_save_template_preview(filename: String, image_data_url: String) -> Result<(), String> {
    let rel = validate_template_path(&filename)?;
    let base = rel.trim_end_matches(".json").to_string();
    let prefix = "data:image/png;base64,";
    let encoded = image_data_url
        .strip_prefix(prefix)
        .ok_or("Expected data:image/png;base64, prefix")?;
    use base64::Engine;
    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("Base64 decode error: {e}"))?;
    let img_data = skia_safe::Data::new_copy(&png_bytes);
    let image =
        skia_safe::Image::from_encoded(img_data).ok_or("Failed to decode PNG image data")?;
    let jpeg_data = image
        .encode(None, skia_safe::EncodedImageFormat::JPEG, 85)
        .ok_or("Failed to encode image as JPEG")?;
    let dest = templates_user_dir().join(format!("{base}.jpg"));
    std::fs::write(&dest, jpeg_data.as_bytes())
        .map_err(|e| format!("Failed to write preview: {e}"))?;
    Ok(())
}

// ─── File-system open commands ────────────────────────────────────────────────

#[tauri::command]
fn backend_open_templates() -> Result<String, String> {
    let dir = templates_user_dir();
    open_path(&dir.to_string_lossy())?;
    Ok(r#"{"message":"Templates folder opened"}"#.to_string())
}

#[tauri::command]
fn backend_open_activities() -> Result<String, String> {
    open_path(&uploads_dir().to_string_lossy())?;
    Ok(r#"{"message":"Activities folder opened"}"#.to_string())
}

/// Single source of truth for available fonts: bundled fonts ∪ user-installed.
#[tauri::command]
fn backend_list_fonts() -> Vec<String> {
    let mut set = std::collections::BTreeSet::new();
    let dirs = [PathBuf::from(resolve_fonts_dir()), fonts_user_dir()];
    for dir in dirs {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for e in entries.flatten() {
                if let Some(name) = e.file_name().to_str() {
                    let lower = name.to_lowercase();
                    if lower.ends_with(".ttf") || lower.ends_with(".otf") {
                        set.insert(name.to_string());
                    }
                }
            }
        }
    }
    set.into_iter().collect()
}

/// Copy a user-picked .ttf/.otf into the user fonts dir; returns updated list.
#[tauri::command]
fn backend_import_font(path: String) -> Result<Vec<String>, String> {
    let src = Path::new(&path);
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());
    if !matches!(ext.as_deref(), Some("ttf") | Some("otf")) {
        return Err("Font must be a .ttf or .otf file".into());
    }
    let name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid font filename".to_string())?;
    let dest = fonts_user_dir().join(name);
    std::fs::copy(src, &dest).map_err(|e| format!("Could not import font: {e}"))?;
    Ok(backend_list_fonts())
}

#[tauri::command]
fn backend_open_downloads(path: Option<String>) -> Result<String, String> {
    let dir = match path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => default_output_dir(),
    };
    open_path(&dir.to_string_lossy())?;
    Ok(r#"{"message":"Folder opened"}"#.to_string())
}

#[tauri::command]
fn backend_open_video(filename: String) -> Result<String, String> {
    let path = PathBuf::from(&filename);
    if !path.exists() {
        return Err(format!("Video file not found: {filename}"));
    }
    open_path(&path.to_string_lossy())?;
    Ok(r#"{"message":"Video opened"}"#.to_string())
}

fn open_path(path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open path: {e}"))?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open path: {e}"))?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open path: {e}"))?;
    Ok(())
}

// ─── GPX upload / load ────────────────────────────────────────────────────────

/// Load a GPX from an absolute path chosen via the native file dialog.
/// Copies it to the uploads dir and returns metadata.
#[tauri::command]
fn backend_load_gpx(path: String) -> Result<String, String> {
    let src = Path::new(&path);
    if !src.exists() {
        return Err(format!("File not found: {path}"));
    }
    let filename = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid filename")?;
    let dest = uploads_dir().join(filename);
    std::fs::copy(src, &dest).map_err(|e| format!("Failed to copy GPX: {e}"))?;
    gpx_metadata_response(filename, &dest.to_string_lossy())
}

/// Receive raw GPX bytes from the frontend (web drag-drop / file picker).
#[tauri::command]
fn backend_upload(file_data: Vec<u8>, filename: String) -> Result<String, String> {
    let dest = uploads_dir().join(&filename);
    std::fs::write(&dest, &file_data).map_err(|e| format!("Failed to write GPX: {e}"))?;
    gpx_metadata_response(&filename, &dest.to_string_lossy())
}

/// Parse GPX at `path` and return `{ filename, duration_seconds, has_data }`.
fn gpx_metadata_response(filename: &str, path: &str) -> Result<String, String> {
    let duration = match render::activity::Activity::from_gpx(path) {
        Ok(activity) => activity.data_len(),
        Err(_) => 0,
    };
    Ok(serde_json::json!({
        "data": "file loaded",
        "filename": filename,
        "duration_seconds": duration,
        "has_data": duration > 0,
    })
    .to_string())
}

// ─── Community templates ──────────────────────────────────────────────────────

#[cfg(not(debug_assertions))]
const GITHUB_API_TEMPLATES: &str =
    "https://api.github.com/repos/walkersutton/cyclemetry/contents/templates";
#[cfg(not(debug_assertions))]
const GITHUB_RAW_TEMPLATES: &str =
    "https://raw.githubusercontent.com/walkersutton/cyclemetry/main/templates";

/// In dev: scan local templates/ folder. In production: walk GitHub Contents API.
#[tauri::command]
async fn backend_community_templates() -> Result<String, String> {
    #[cfg(debug_assertions)]
    {
        community_templates_from_disk()
    }
    #[cfg(not(debug_assertions))]
    community_templates_from_github().await
}

/// Returns the repo's templates/ folder for dev-mode community browsing.
/// The exe lives under `src-tauri/target/debug/`, which also has a build-copied
/// `templates/`. Require the ancestor to contain `src-tauri/` so we match the
/// real repo root and not that stale build-output copy.
#[cfg(debug_assertions)]
fn repo_templates_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| {
            exe.ancestors()
                .find(|p| p.join("src-tauri").is_dir() && p.join("templates").is_dir())
                .map(|root| root.join("templates"))
        })
        .unwrap_or_else(|| PathBuf::from("templates"))
}

/// Template folders use lowercase snake_case names (e.g. `crit`, `power_and_hr`).
/// Dirs starting with uppercase (e.g. `TO_BE_REFACTORED`) or `.` are skipped.
fn is_template_dir_name(name: &str) -> bool {
    name.starts_with(|c: char| c.is_ascii_lowercase())
}

#[cfg(debug_assertions)]
fn community_templates_from_disk() -> Result<String, String> {
    let dir = repo_templates_dir();
    let mut templates: Vec<serde_json::Value> = Vec::new();
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Ok("[]".to_string());
    };
    for entry in entries.flatten() {
        let Ok(ftype) = entry.file_type() else {
            continue;
        };
        let name_os = entry.file_name();
        let name = name_os.to_string_lossy().to_string();
        if ftype.is_dir() && is_template_dir_name(&name) {
            // Each template folder contains {name}/{name}.json + preview.jpg
            let json_path = dir.join(&name).join(format!("{name}.json"));
            if json_path.exists() {
                let id = format!("{name}.json");
                let display = template_display_name(&name);
                let preview_url = jpg_data_url(&dir.join(&name).join("preview.jpg"))
                    .unwrap_or(serde_json::Value::Null);
                templates.push(serde_json::json!({
                    "id": id,
                    "name": display,
                    "preview_url": preview_url,
                }));
            }
        }
    }
    serde_json::to_string(&templates).map_err(|e| e.to_string())
}

#[cfg(not(debug_assertions))]
async fn community_templates_from_github() -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("cyclemetry-app")
        .build()
        .map_err(|e| format!("Client error: {e}"))?;

    let root: serde_json::Value = client
        .get(GITHUB_API_TEMPLATES)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    let entries = root.as_array().ok_or("Expected array from GitHub API")?;

    // Each template is a subdirectory named with lowercase snake_case.
    // Inside: {name}/{name}.json + preview.jpg
    let mut templates: Vec<serde_json::Value> = Vec::new();
    for entry in entries {
        let name = entry["name"].as_str().unwrap_or("");
        if entry["type"] == "dir" && is_template_dir_name(name) {
            let display = template_display_name(name);
            let preview_url = format!("{GITHUB_RAW_TEMPLATES}/{name}/preview.jpg");
            templates.push(serde_json::json!({
                "id": format!("{name}.json"),
                "name": display,
                "preview_url": preview_url,
            }));
        }
    }

    serde_json::to_string(&templates).map_err(|e| e.to_string())
}

#[tauri::command]
async fn backend_install_community_template(id: String) -> Result<String, String> {
    let rel = validate_template_path(&id)?;
    // rel is e.g. "crit.json"; the source lives in the {name}/ subfolder
    let dest = templates_user_dir().join(&rel);
    install_community_template_impl(&rel, &dest).await
}

#[cfg(debug_assertions)]
async fn install_community_template_impl(
    rel: &str,
    dest: &std::path::Path,
) -> Result<String, String> {
    let name = rel.trim_end_matches(".json");
    // Source: templates/{name}/{name}.json
    let src = repo_templates_dir().join(name).join(rel);
    std::fs::copy(&src, dest).map_err(|e| format!("Failed to copy template: {e}"))?;
    let content =
        std::fs::read_to_string(dest).map_err(|e| format!("Failed to read template: {e}"))?;
    std::fs::write(dest.with_extension("json.remote"), &content)
        .map_err(|e| format!("Failed to write sidecar: {e}"))?;
    Ok(serde_json::json!({ "message": format!("Installed {rel}"), "filename": rel }).to_string())
}

#[cfg(not(debug_assertions))]
async fn install_community_template_impl(
    rel: &str,
    dest: &std::path::Path,
) -> Result<String, String> {
    let name = rel.trim_end_matches(".json");
    // Source: templates/{name}/{name}.json on GitHub raw
    let url = format!("{GITHUB_RAW_TEMPLATES}/{name}/{rel}");
    let body = reqwest::Client::builder()
        .user_agent("cyclemetry-app")
        .build()
        .map_err(|e| format!("Client error: {e}"))?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .text()
        .await
        .map_err(|e| format!("Read error: {e}"))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Invalid template JSON: {e}"))?;
    let pretty =
        serde_json::to_string_pretty(&parsed).map_err(|e| format!("Serialize error: {e}"))?;
    std::fs::write(dest, &pretty).map_err(|e| format!("Failed to write template: {e}"))?;
    std::fs::write(dest.with_extension("json.remote"), &pretty)
        .map_err(|e| format!("Failed to write sidecar: {e}"))?;
    Ok(serde_json::json!({ "message": format!("Installed {rel}"), "filename": rel }).to_string())
}

// ─── Native Rust renderer ─────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub message: String,
}

// ─── Demo frame cache ─────────────────────────────────────────────────────────

/// Cached activity + scene for preview frames.
/// Keyed on (gpx_path, config_hash) — rebuilt only when GPX or template changes.
struct DemoCache {
    gpx_key: String,
    config_hash: u64,
    template: render::template::Template,
    activity: render::activity::Activity,
    scene_cache: render::frame::SceneCache,
}
type SharedDemoCache = Arc<Mutex<Option<DemoCache>>>;

fn quick_hash(s: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    s.hash(&mut h);
    h.finish()
}

// ─────────────────────────────────────────────────────────────────────────────

struct NativeRenderState {
    progress: render::scene::RenderProgress,
    is_running: bool,
    error: Option<String>,
}

impl NativeRenderState {
    fn new() -> Self {
        NativeRenderState {
            progress: render::scene::RenderProgress::new(),
            is_running: false,
            error: None,
        }
    }
}

type SharedRenderState = Arc<Mutex<NativeRenderState>>;

#[tauri::command]
async fn native_render(
    config: serde_json::Value,
    gpx_filename: String,
    output_dir: Option<String>,
    target_width: Option<u32>,
    target_height: Option<u32>,
    state: tauri::State<'_, SharedRenderState>,
) -> Result<String, String> {
    let target = match (target_width, target_height) {
        (Some(w), Some(h)) => Some((w, h)),
        _ => None,
    };
    let template = render::template::Template::from_value_scaled(config.clone(), target)
        .map_err(|e| format!("Template parse error: {e}"))?;
    let output_path = resolve_output_path(&config, output_dir.as_deref());
    let fonts_dir = resolve_fonts_dir();
    let (gpx_path, _) = resolve_gpx_path(&gpx_filename)?;

    let progress_clone = {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        *s = NativeRenderState::new();
        s.is_running = true;
        render::scene::RenderProgress {
            frames_rendered: s.progress.frames_rendered.clone(),
            total_frames: s.progress.total_frames.clone(),
            cancelled: s.progress.cancelled.clone(),
        }
    };
    let state_clone = state.inner().clone();
    let output_path_for_response = output_path.clone();

    tokio::task::spawn_blocking(move || {
        // catch_unwind ensures is_running is always cleared even if render_video panics
        // (e.g. Skia surface failure, rayon worker panic). Without this, a panic would
        // silently swallow the JoinHandle error and leave is_running=true forever.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            render::scene::render_video(
                &gpx_path,
                &template,
                &output_path,
                &fonts_dir,
                &progress_clone,
            )
        }))
        .unwrap_or_else(|e| {
            let msg = e
                .downcast_ref::<String>()
                .map(String::as_str)
                .or_else(|| e.downcast_ref::<&str>().copied())
                .unwrap_or("unknown panic");
            log::error!("Render panicked: {msg}");
            Err(format!("Render crashed: {msg}"))
        });

        let mut s = state_clone.lock().unwrap_or_else(|e| e.into_inner());
        s.is_running = false;
        match result {
            Ok(()) => {
                s.error = None;
                log::info!("Native render complete: {output_path}");
            }
            Err(e) => {
                log::error!("Native render error: {e}");
                s.error = Some(e);
            }
        }
    });

    Ok(
        serde_json::json!({ "status": "started", "output_path": output_path_for_response })
            .to_string(),
    )
}

#[tauri::command]
async fn native_progress(state: tauri::State<'_, SharedRenderState>) -> Result<String, String> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let (rendered, total) = s.progress.snapshot();
    let fraction = if total > 0 {
        rendered as f64 / total as f64
    } else {
        0.0
    };
    Ok(serde_json::json!({
        "frames_rendered": rendered,
        "total_frames": total,
        "fraction": fraction,
        "is_running": s.is_running,
        "error": s.error,
    })
    .to_string())
}

#[tauri::command]
async fn native_cancel(state: tauri::State<'_, SharedRenderState>) -> Result<String, String> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.progress.cancel();
    log::info!("Render cancel requested");
    Ok(serde_json::json!({ "status": "cancel_requested" }).to_string())
}

/// Preview a single frame.
///
/// Hot-path optimisation: raw 1 Hz GPX data (no interpolation) gives 30× fewer
/// path vertices for chart backgrounds, and the parsed Activity + SceneCache are
/// cached in `SharedDemoCache` so subsequent frames cost only a single
/// `render_frame` call (~5–20 ms) instead of a full rebuild (~500 ms–2 s).
#[tauri::command]
async fn native_demo(
    config: serde_json::Value,
    gpx_filename: String,
    frame_index: u32,
    preview_fps: u32,
    target_width: Option<u32>,
    target_height: Option<u32>,
    demo_cache: tauri::State<'_, SharedDemoCache>,
) -> Result<String, String> {
    let target = match (target_width, target_height) {
        (Some(w), Some(h)) => Some((w, h)),
        _ => None,
    };
    // Preview canvas = chosen output resolution (so aspect ratio is honored).
    let wh = target.unwrap_or_else(|| template_value_wh(&config));
    let preview_fps = preview_fps.max(1);
    // Include preview_fps + target in cache hash so changing either rebuilds.
    let config_hash = quick_hash(&format!("{}:{}:{:?}", config, preview_fps, target));
    // No bundled demo file: if the GPX can't be resolved, preview synthetic
    // sample data rather than failing the whole preview.
    let (gpx_path, gpx_warning) = match resolve_gpx_path(&gpx_filename) {
        Ok(v) => v,
        Err(_) => {
            let real = !gpx_filename.is_empty()
                && gpx_filename != "null"
                && gpx_filename != "demo.gpxinit"
                && gpx_filename != "demo.gpx";
            let warning = real
                .then(|| format!("GPX '{gpx_filename}' not found — showing sample data instead"));
            ("<synthetic>".to_string(), warning)
        }
    };
    let fonts_dir = resolve_fonts_dir();
    let cache_arc = demo_cache.inner().clone();

    let (rgba, elements) = tokio::task::spawn_blocking(move || {
        let mut guard = cache_arc.lock().unwrap_or_else(|e| e.into_inner());

        let needs_rebuild = match &*guard {
            None => true,
            Some(c) => c.gpx_key != gpx_path || c.config_hash != config_hash,
        };

        if needs_rebuild {
            let template = render::template::Template::from_value_scaled(config, target)
                .map_err(|e| format!("Template parse error: {e}"))?;

            let mut activity = if gpx_path == "<synthetic>" {
                render::activity::Activity::synthetic(60)
            } else {
                render::activity::Activity::from_gpx(&gpx_path)
                    .map_err(|e| format!("GPX parse error: {e}"))?
            };

            // Trim first (1 Hz indices == seconds), then interpolate so chart
            // paths are built at the requested preview resolution.
            let start = template.scene.start.unwrap_or(0);
            let end = template
                .scene
                .end
                .unwrap_or(activity.data_len())
                .min(activity.data_len());
            if end > start {
                activity
                    .trim(start, end)
                    .map_err(|e| format!("Trim error: {e}"))?;
            }
            if preview_fps > 1 {
                activity.interpolate(preview_fps);
            }

            let scene_cache = render::frame::SceneCache::build(&activity, &template, &fonts_dir)
                .map_err(|e| format!("SceneCache build failed: {e}"))?;

            *guard = Some(DemoCache {
                gpx_key: gpx_path,
                config_hash,
                template,
                activity,
                scene_cache,
            });
        }

        let cached = guard.as_ref().unwrap();
        // frame_index is relative to trimmed+interpolated activity start (0-based).
        let frame_idx = (frame_index as usize).min(cached.activity.data_len().saturating_sub(1));

        // Preview renders the full frame (placement context); no crop.
        let rgba = render::frame::render_frame(
            frame_idx,
            &cached.scene_cache,
            &cached.activity,
            &cached.template,
            None,
        );
        let elements = render::frame::measure_elements(
            frame_idx,
            &cached.activity,
            &cached.template,
            &fonts_dir,
        );
        Ok::<(Vec<u8>, Vec<render::frame::ElementBounds>), String>((rgba, elements))
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))??;

    let png = rgba_to_png(&rgba, wh);
    use base64::{engine::general_purpose, Engine as _};
    let b64 = general_purpose::STANDARD.encode(&png);
    Ok(serde_json::json!({
        "image": format!("data:image/png;base64,{b64}"),
        "elements": elements,
        "warning": gpx_warning,
    })
    .to_string())
}

// Pixel buffers from render_frame are BGRA8888 (Skia's native raster format,
// fed to FFmpeg as -pix_fmt bgra with zero conversion). The ColorType here must
// match so the preview PNG doesn't swap red/blue.
fn rgba_to_png(rgba: &[u8], (w, h): (u32, u32)) -> Vec<u8> {
    let info = skia_safe::ImageInfo::new(
        skia_safe::ISize::new(w as i32, h as i32),
        skia_safe::ColorType::BGRA8888,
        skia_safe::AlphaType::Premul,
        None,
    );
    let data = skia_safe::Data::new_copy(rgba);
    if let Some(img) = skia_safe::images::raster_from_data(&info, data, (w * 4) as usize) {
        if let Some(encoded) = img.encode(None, skia_safe::EncodedImageFormat::PNG, None) {
            return encoded.as_bytes().to_vec();
        }
    }
    vec![]
}

fn template_value_wh(config: &serde_json::Value) -> (u32, u32) {
    let w = config
        .pointer("/scene/width")
        .and_then(|x| x.as_u64())
        .unwrap_or(1920) as u32;
    let h = config
        .pointer("/scene/height")
        .and_then(|x| x.as_u64())
        .unwrap_or(1080) as u32;
    (w, h)
}

// ─── Recent GPX state ─────────────────────────────────────────────────────────

type SharedRecentGpx = Arc<Mutex<Vec<String>>>;

#[tauri::command]
fn record_gpx_opened(app: tauri::AppHandle, path: String) {
    let state = app.state::<SharedRecentGpx>();
    let mut files = state.lock().unwrap();
    *files = recent::push(path, files.clone());
    recent::save(&files);
}

// ─── App entry point ──────────────────────────────────────────────────────────

pub fn run() {
    // Read recent GPX list before building the app so the menu can use it at startup.
    #[cfg(target_os = "macos")]
    let initial_recent_gpx = recent::read();
    #[cfg(not(target_os = "macos"))]
    let initial_recent_gpx: Vec<String> = Vec::new();

    let recent_gpx_state: SharedRecentGpx = Arc::new(Mutex::new(initial_recent_gpx.clone()));

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .manage(Arc::new(Mutex::new(NativeRenderState::new())) as SharedRenderState)
        .manage(Arc::new(Mutex::new(None)) as SharedDemoCache)
        .manage(recent_gpx_state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            app_build_info,
            native_render,
            native_progress,
            native_cancel,
            native_demo,
            backend_list_templates,
            backend_get_template,
            backend_save_template,
            backend_open_templates,
            backend_list_fonts,
            backend_import_font,
            backend_open_activities,
            backend_open_downloads,
            backend_open_video,
            backend_load_gpx,
            backend_upload,
            backend_community_templates,
            backend_install_community_template,
            backend_delete_template,
            backend_save_template_preview,
            record_gpx_opened,
        ])
        .setup(move |app| {
            if let Ok(dir) = app.path().app_data_dir() {
                std::fs::create_dir_all(&dir).ok();
                APP_DATA_DIR.set(dir).ok();
            }

            #[cfg(all(debug_assertions, target_os = "macos"))]
            {
                use objc2::{AnyThread, MainThreadMarker};
                use objc2_app_kit::{NSApplication, NSImage};
                use objc2_foundation::NSData;
                let mtm = MainThreadMarker::new().expect("setup must run on main thread");
                let data = NSData::with_bytes(include_bytes!("../icons/icon.icns"));
                if let Some(icon) = NSImage::initWithData(NSImage::alloc(), &data) {
                    let ns_app = NSApplication::sharedApplication(mtm);
                    unsafe { ns_app.setApplicationIconImage(Some(&icon)) };
                }
            }

            // ── macOS menu bar ──────────────────────────────────────────────
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};

                // ── Cyclemetry (app) menu ─────────────────────────────────
                let settings =
                    MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;
                let check_updates = MenuItem::with_id(
                    app,
                    "check_updates",
                    "Check for Updates...",
                    true,
                    None::<&str>,
                )?;
                let app_submenu = Submenu::with_items(
                    app,
                    "Cyclemetry",
                    true,
                    &[
                        &PredefinedMenuItem::about(app, None, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &settings,
                        &PredefinedMenuItem::separator(app)?,
                        &check_updates,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::services(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::hide(app, None)?,
                        &PredefinedMenuItem::hide_others(app, None)?,
                        &PredefinedMenuItem::show_all(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, None)?,
                    ],
                )?;

                // ── File menu ─────────────────────────────────────────────
                let open_gpx =
                    MenuItem::with_id(app, "open_gpx", "Open GPX...", true, Some("CmdOrCtrl+O"))?;

                // "Open Recent" submenu — items built from list stored on disk
                let no_recent_item =
                    MenuItem::with_id(app, "no_recent", "No Recent Files", false, None::<&str>)?;
                let clear_recent_item =
                    MenuItem::with_id(app, "clear_recent", "Clear Recent", true, None::<&str>)?;
                let recent_sep = PredefinedMenuItem::separator(app)?;
                let recent_gpx_items: Vec<MenuItem<_>> = initial_recent_gpx
                    .iter()
                    .enumerate()
                    .map(|(i, path)| {
                        let name = std::path::Path::new(path)
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or(path.as_str())
                            .to_owned();
                        MenuItem::with_id(app, format!("recent_gpx_{i}"), name, true, None::<&str>)
                    })
                    .collect::<tauri::Result<_>>()?;

                let open_recent = if initial_recent_gpx.is_empty() {
                    Submenu::with_items(app, "Open Recent", false, &[&no_recent_item])?
                } else {
                    let mut refs: Vec<&dyn IsMenuItem<_>> = recent_gpx_items
                        .iter()
                        .map(|i| i as &dyn IsMenuItem<_>)
                        .collect();
                    refs.push(&recent_sep);
                    refs.push(&clear_recent_item);
                    Submenu::with_items(app, "Open Recent", true, &refs)?
                };

                let file_sep1 = PredefinedMenuItem::separator(app)?;
                let show_dl = MenuItem::with_id(
                    app,
                    "show_downloads",
                    "Show Downloads Folder",
                    true,
                    None::<&str>,
                )?;

                let file_submenu = Submenu::with_items(
                    app,
                    "File",
                    true,
                    &[&open_gpx, &open_recent, &file_sep1, &show_dl],
                )?;

                // ── Activities menu ───────────────────────────────────────
                let act_open = MenuItem::with_id(
                    app,
                    "activities_open_gpx",
                    "Open Activity (GPX)…",
                    true,
                    None::<&str>,
                )?;
                let act_sep = PredefinedMenuItem::separator(app)?;
                let act_show_folder = MenuItem::with_id(
                    app,
                    "activities_show_folder",
                    "Show Activities Folder",
                    true,
                    None::<&str>,
                )?;
                let activities_submenu = Submenu::with_items(
                    app,
                    "Activities",
                    true,
                    &[&act_open, &act_sep, &act_show_folder],
                )?;

                // ── Help menu ─────────────────────────────────────────────
                let help_docs =
                    MenuItem::with_id(app, "help_docs", "Documentation", true, None::<&str>)?;
                let help_issues =
                    MenuItem::with_id(app, "help_issues", "Report an Issue", true, None::<&str>)?;
                let edit_submenu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[
                        &PredefinedMenuItem::undo(app, None)?,
                        &PredefinedMenuItem::redo(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::cut(app, None)?,
                        &PredefinedMenuItem::copy(app, None)?,
                        &PredefinedMenuItem::paste(app, None)?,
                        &PredefinedMenuItem::select_all(app, None)?,
                    ],
                )?;

                let help_submenu =
                    Submenu::with_items(app, "Help", true, &[&help_docs, &help_issues])?;

                // ── Templates menu ────────────────────────────────────────
                let new_tpl =
                    MenuItem::with_id(app, "new_template", "New Template", true, None::<&str>)?;
                let save_tpl = MenuItem::with_id(
                    app,
                    "save_template",
                    "Save Template",
                    true,
                    Some("CmdOrCtrl+S"),
                )?;
                let save_tpl_as = MenuItem::with_id(
                    app,
                    "save_template_as",
                    "Save Template As...",
                    true,
                    Some("CmdOrCtrl+Shift+S"),
                )?;
                let tpl_sep1 = PredefinedMenuItem::separator(app)?;
                let show_tpl_dir = MenuItem::with_id(
                    app,
                    "show_templates",
                    "Show Templates Folder",
                    true,
                    None::<&str>,
                )?;
                let tpl_sep2 = PredefinedMenuItem::separator(app)?;
                let browse_community = MenuItem::with_id(
                    app,
                    "browse_community_templates",
                    "Browse Community Templates…",
                    true,
                    None::<&str>,
                )?;
                let templates_submenu = Submenu::with_items(
                    app,
                    "Templates",
                    true,
                    &[
                        &new_tpl,
                        &save_tpl,
                        &save_tpl_as,
                        &tpl_sep1,
                        &show_tpl_dir,
                        &tpl_sep2,
                        &browse_community,
                    ],
                )?;

                app.set_menu(Menu::with_items(
                    app,
                    &[
                        &app_submenu,
                        &file_submenu,
                        &edit_submenu,
                        &templates_submenu,
                        &activities_submenu,
                        &help_submenu,
                    ],
                )?)?;

                app.on_menu_event(|app_handle, event| {
                    use tauri::Emitter;
                    let id = event.id().as_ref();
                    match id {
                        "settings" => {
                            app_handle.emit("menu_settings", ()).ok();
                        }
                        "check_updates" => {
                            app_handle.emit("check_for_updates", ()).ok();
                        }
                        "open_gpx" | "activities_open_gpx" => {
                            app_handle.emit("menu_open_gpx", ()).ok();
                        }
                        "activities_show_folder" => {
                            app_handle.emit("menu_show_activities", ()).ok();
                        }
                        "save_template" => {
                            app_handle.emit("menu_save_template", ()).ok();
                        }
                        "save_template_as" => {
                            app_handle.emit("menu_save_template_as", ()).ok();
                        }
                        "new_template" => {
                            app_handle.emit("menu_new_template", ()).ok();
                        }
                        "browse_community_templates" => {
                            app_handle.emit("menu_browse_community_templates", ()).ok();
                        }
                        "show_downloads" => {
                            app_handle.emit("menu_show_downloads", ()).ok();
                        }
                        "show_templates" => {
                            app_handle.emit("menu_show_templates", ()).ok();
                        }
                        "clear_recent" => {
                            app_handle
                                .state::<SharedRecentGpx>()
                                .lock()
                                .unwrap()
                                .clear();
                            recent::clear();
                        }
                        "help_docs" => {
                            std::process::Command::new("open")
                                .arg("https://github.com/walkersutton/cyclemetry#readme")
                                .spawn()
                                .ok();
                        }
                        "help_issues" => {
                            std::process::Command::new("open")
                                .arg("https://github.com/walkersutton/cyclemetry/issues/new")
                                .spawn()
                                .ok();
                        }
                        _ if id.starts_with("recent_gpx_") => {
                            if let Ok(idx) = id["recent_gpx_".len()..].parse::<usize>() {
                                let state = app_handle.state::<SharedRecentGpx>();
                                let files = state.lock().unwrap();
                                if let Some(path) = files.get(idx) {
                                    app_handle.emit("menu_open_recent_gpx", path.clone()).ok();
                                }
                            }
                        }
                        _ => {}
                    }
                });
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::new()
                        .level(log::LevelFilter::Debug)
                        .targets([
                            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                        ])
                        .build(),
                )?;
            } else {
                app.handle().plugin(
                    tauri_plugin_log::Builder::new()
                        .level(log::LevelFilter::Info)
                        .level_for("tauri_plugin_updater", log::LevelFilter::Warn)
                        .targets([tauri_plugin_log::Target::new(
                            tauri_plugin_log::TargetKind::LogDir {
                                file_name: Some("cyclemetry".into()),
                            },
                        )])
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
