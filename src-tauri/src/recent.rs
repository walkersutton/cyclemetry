use std::path::PathBuf;

const MAX: usize = 8;

fn file_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("com.cyclemetry.app")
        .join("recent_gpx.json")
}

pub fn read() -> Vec<String> {
    let data = std::fs::read_to_string(file_path()).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

pub fn save(files: &[String]) {
    let path = file_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).ok();
    }
    std::fs::write(path, serde_json::to_string(files).unwrap_or_default()).ok();
}

pub fn clear() {
    save(&[]);
}

/// Prepend `new_path` to `current`, deduplicate, cap at MAX. Returns new list.
pub fn push(new_path: String, mut current: Vec<String>) -> Vec<String> {
    current.retain(|f| f != &new_path);
    current.insert(0, new_path);
    current.truncate(MAX);
    current
}
