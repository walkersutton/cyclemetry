#[cfg_attr(mobile, tauri::mobile_entry_point)]

use http_body_util::{BodyExt, Full};
use hyper::{body::Bytes, Request};
use hyperlocal::{UnixConnector, Uri};
use serde::{Deserialize, Serialize};
use std::path::Path;

const SOCKET_PATH: &str = "/tmp/cyclemetry.sock";

/// Make a GET request to the backend via Unix socket
async fn backend_get(path: &str) -> Result<String, String> {
    let client = hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
        .build::<_, Full<Bytes>>(UnixConnector);

    let uri = Uri::new(SOCKET_PATH, path);
    let req = Request::builder()
        .method("GET")
        .uri(uri)
        .body(Full::default())
        .map_err(|e| e.to_string())?;

    let res = client.request(req).await.map_err(|e| e.to_string())?;
    let body = res.into_body().collect().await.map_err(|e| e.to_string())?;
    let bytes = body.to_bytes();
    String::from_utf8(bytes.to_vec()).map_err(|e| e.to_string())
}

/// Make a POST request to the backend via Unix socket
async fn backend_post(path: &str, body: String) -> Result<String, String> {
    let client = hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
        .build::<_, Full<Bytes>>(UnixConnector);

    let uri = Uri::new(SOCKET_PATH, path);
    let req = Request::builder()
        .method("POST")
        .uri(uri)
        .header("Content-Type", "application/json")
        .body(Full::new(Bytes::from(body)))
        .map_err(|e| e.to_string())?;

    let res = client.request(req).await.map_err(|e| e.to_string())?;
    let body = res.into_body().collect().await.map_err(|e| e.to_string())?;
    let bytes = body.to_bytes();
    String::from_utf8(bytes.to_vec()).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub message: String,
}

#[tauri::command]
async fn backend_health() -> Result<String, String> {
    backend_get("/api/health").await
}

#[tauri::command]
async fn backend_demo(config: String, gpx_filename: String, second: u32) -> Result<String, String> {
    let body = serde_json::json!({
        "config": serde_json::from_str::<serde_json::Value>(&config).unwrap_or(serde_json::Value::Null),
        "gpx_filename": gpx_filename,
        "second": second
    });
    backend_post("/api/demo", body.to_string()).await
}

#[tauri::command]
async fn backend_render(config: String, gpx_filename: String) -> Result<String, String> {
    let body = serde_json::json!({
        "config": serde_json::from_str::<serde_json::Value>(&config).unwrap_or(serde_json::Value::Null),
        "gpx_filename": gpx_filename
    });
    backend_post("/api/render-video", body.to_string()).await
}

#[tauri::command]
async fn backend_progress() -> Result<String, String> {
    backend_get("/api/render-progress").await
}

#[tauri::command]
async fn backend_open_downloads() -> Result<String, String> {
    backend_post("/api/open-downloads", "{}".to_string()).await
}

#[tauri::command]
async fn backend_open_video(filename: String) -> Result<String, String> {
    let body = serde_json::json!({ "filename": filename });
    backend_post("/api/open-video", body.to_string()).await
}

#[tauri::command]
async fn backend_load_gpx(path: String) -> Result<String, String> {
    let body = serde_json::json!({ "path": path });
    backend_post("/api/load-gpx", body.to_string()).await
}

#[tauri::command]
async fn backend_upload(file_data: Vec<u8>, filename: String) -> Result<String, String> {
    // For file uploads, we need multipart form data
    // This is more complex; we'll send as base64 for simplicity
    let client = hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
        .build::<_, Full<Bytes>>(UnixConnector);

    // Build multipart boundary
    let boundary = "----TauriUploadBoundary";
    let mut body_bytes = Vec::new();
    
    // Add file part
    body_bytes.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body_bytes.extend_from_slice(format!("Content-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n", filename).as_bytes());
    body_bytes.extend_from_slice(b"Content-Type: application/octet-stream\r\n\r\n");
    body_bytes.extend_from_slice(&file_data);
    body_bytes.extend_from_slice(format!("\r\n--{}--\r\n", boundary).as_bytes());

    let uri = Uri::new(SOCKET_PATH, "/upload");
    let req = Request::builder()
        .method("POST")
        .uri(uri)
        .header("Content-Type", format!("multipart/form-data; boundary={}", boundary))
        .body(Full::new(Bytes::from(body_bytes)))
        .map_err(|e| e.to_string())?;

    let res = client.request(req).await.map_err(|e| e.to_string())?;
    let body = res.into_body().collect().await.map_err(|e| e.to_string())?;
    let bytes = body.to_bytes();
    String::from_utf8(bytes.to_vec()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn backend_list_templates() -> Result<String, String> {
    backend_get("/api/templates").await
}

#[tauri::command]
async fn backend_save_template(config: String, filename: String) -> Result<String, String> {
    let body = serde_json::json!({ "config": config, "filename": filename });
    backend_post("/api/save-template", body.to_string()).await
}

#[tauri::command]
async fn backend_get_template(filename: String) -> Result<String, String> {
    let path = format!("/templates/{}", filename);
    backend_get(&path).await
}

#[tauri::command]
async fn backend_open_templates() -> Result<String, String> {
    backend_post("/api/open-templates", "{}".to_string()).await
}

#[tauri::command]
async fn backend_cancel() -> Result<String, String> {
    backend_post("/api/cancel-render", "{}".to_string()).await
}

#[tauri::command]
fn get_image_url(filename: String) -> String {
    // Return path for serving from the public directory
    format!("http://unix:{}/images/{}", SOCKET_PATH, filename)
}

/// Check if the backend socket exists and is reachable
#[tauri::command]
async fn backend_socket_ready() -> bool {
    Path::new(SOCKET_PATH).exists()
}

#[tauri::command]
async fn backend_image_data(filename: String) -> Result<String, String> {
    let client = hyper_util::client::legacy::Client::builder(hyper_util::rt::TokioExecutor::new())
        .build::<_, Full<Bytes>>(UnixConnector);

    let path = format!("/images/{}", filename);
    let uri = Uri::new(SOCKET_PATH, &path);
    let req = Request::builder()
        .method("GET")
        .uri(uri)
        .body(Full::default())
        .map_err(|e| e.to_string())?;

    let res = client.request(req).await.map_err(|e| e.to_string())?;
    
    // Check content type
    let content_type = res.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "image/png".to_string());

    let body = res.into_body().collect().await.map_err(|e| e.to_string())?;
    let bytes = body.to_bytes();
    
    // Convert to base64 data URL
    use base64::{Engine as _, engine::general_purpose};
    let b64 = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", content_type, b64))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            backend_health,
            backend_demo,
            backend_render,
            backend_progress,
            backend_cancel,
            backend_load_gpx,
            backend_list_templates,
            backend_get_template,
            backend_save_template,
            backend_open_templates,
            backend_open_downloads,
            backend_open_video,
            backend_upload,
            backend_socket_ready,
            get_image_url,
            backend_image_data
        ])
        .setup(|app| {
            // Spawn the python sidecar
            #[cfg(desktop)]
            {
                use tauri_plugin_shell::ShellExt;
                let sidecar_command = app.handle().shell().sidecar("cyclemetry-server");
                if let Ok(cmd) = sidecar_command {
                    match cmd.spawn() {
                        Ok((_rx, _child)) => {
                            log::info!("Successfully spawned sidecar: cyclemetry-server");
                        }
                        Err(e) => {
                            log::error!("Failed to spawn sidecar: {}", e);
                        }
                    }
                } else if let Err(e) = sidecar_command {
                    log::error!("Failed to initialize sidecar command: {}", e);
                }
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
