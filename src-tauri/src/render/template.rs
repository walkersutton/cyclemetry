use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub scene: SceneConfig,
    #[serde(default, deserialize_with = "null_seq_as_default")]
    pub labels: Vec<LabelConfig>,
    #[serde(default, deserialize_with = "null_seq_as_default")]
    pub values: Vec<ValueConfig>,
    #[serde(default, deserialize_with = "null_seq_as_default")]
    pub plots: Vec<PlotConfig>,
}

/// `#[serde(default)]` covers a missing key but NOT an explicit `null`
/// (which errors with "invalid type: null, expected a sequence").
/// Templates are user-editable / community-sourced, so treat an explicit
/// `null` array the same as absent → empty.
fn null_seq_as_default<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Ok(Option::<Vec<T>>::deserialize(deserializer)?.unwrap_or_default())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneConfig {
    pub width: u32,
    pub height: u32,
    #[serde(default = "default_fps")]
    pub fps: u32,
    pub font_size: Option<f32>,
    pub font: Option<String>,
    pub overlay_filename: Option<String>,
    pub start: Option<usize>,
    pub end: Option<usize>,
    pub decimal_rounding: Option<i32>,
    pub color: Option<String>,
    pub opacity: Option<f32>,
}

fn default_fps() -> u32 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabelConfig {
    pub text: String,
    pub x: f32,
    pub y: f32,
    pub font_size: Option<f32>,
    pub font: Option<String>,
    pub color: Option<String>,
    pub opacity: Option<f32>,
    pub decimal_rounding: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueConfig {
    pub value: String,
    pub x: f32,
    pub y: f32,
    pub font_size: Option<f32>,
    pub font: Option<String>,
    pub color: Option<String>,
    pub opacity: Option<f32>,
    pub unit: Option<String>,
    pub suffix: Option<String>,
    pub decimal_rounding: Option<i32>,
    pub hours_offset: Option<f32>,
    pub time_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlotConfig {
    pub value: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub dpi: Option<f32>,
    pub color: Option<String>,
    pub opacity: Option<f32>,
    pub line: Option<LineConfig>,
    pub fill: Option<FillConfig>,
    pub margin: Option<f64>,
    pub points: Option<Vec<PointConfig>>,
    pub point_label: Option<PointLabelConfig>,
    pub rotation: Option<f32>,
    pub bbox: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineConfig {
    pub width: Option<f32>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FillConfig {
    pub opacity: Option<f32>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointConfig {
    pub color: Option<String>,
    pub weight: Option<f32>,
    pub opacity: Option<f32>,
    pub edge_color: Option<String>,
    pub remove_edge_color: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PointLabelConfig {
    pub font_size: Option<f32>,
    pub color: Option<String>,
    pub font: Option<String>,
    pub x_offset: Option<f32>,
    pub y_offset: Option<f32>,
    pub units: Option<Vec<String>>,
    pub decimal_rounding: Option<i32>,
}

impl PlotConfig {
    pub fn has_position_markers(&self) -> bool {
        self.points.as_ref().map(|p| !p.is_empty()).unwrap_or(false)
    }

    pub fn line_color(&self) -> String {
        self.line
            .as_ref()
            .and_then(|l| l.color.clone())
            .or_else(|| self.color.clone())
            .unwrap_or_else(|| "#ffffff".to_string())
    }

    pub fn line_width(&self) -> f32 {
        self.line.as_ref().and_then(|l| l.width).unwrap_or(1.75)
    }

    pub fn fill_opacity(&self) -> Option<f32> {
        self.fill.as_ref().and_then(|f| f.opacity)
    }

    pub fn fill_color(&self) -> String {
        self.fill
            .as_ref()
            .and_then(|f| f.color.clone())
            .or_else(|| self.color.clone())
            .unwrap_or_else(|| "#ffffff".to_string())
    }

    pub fn margin_fraction(&self) -> f64 {
        self.margin.unwrap_or(0.1)
    }
}

impl Template {
    #[cfg(test)]
    pub fn from_value(raw: serde_json::Value) -> Result<Self, serde_json::Error> {
        Self::from_value_scaled(raw, None)
    }

    /// Parse a template, optionally retargeting it to a chosen output
    /// resolution. Templates are authored at one resolution; we scale every
    /// spatial field by a single uniform factor derived from **height**
    /// (`target_height / authored_height`) and set the canvas to the exact
    /// target. Non-16:9 targets keep their aspect: the canvas is the target
    /// width/height and elements positioned past the new width simply fall
    /// off-screen (acceptable until aspect-specific template variants exist).
    pub fn from_value_scaled(
        mut raw: serde_json::Value,
        target: Option<(u32, u32)>,
    ) -> Result<Self, serde_json::Error> {
        if let Some((tw, th)) = target {
            let authored_h = raw
                .get("scene")
                .and_then(|s| s.get("height"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            if authored_h > 0.0 {
                // Always retarget (even when factor ≈ 1) so the canvas adopts
                // the chosen width/height — e.g. 3840×2160 → 2160×2160 square
                // has factor 1 but still needs scene.width updated.
                let factor = th as f64 / authored_h;
                scale_template(&mut raw, factor, tw, th);
            }
        }

        // Apply scene defaults before deserializing
        if let Some(scene) = raw.get_mut("scene") {
            if scene.get("fps").is_none() {
                scene["fps"] = serde_json::json!(30);
            }
            if scene.get("font").is_none() {
                scene["font"] = serde_json::json!("Arial.ttf");
            }
        }

        // Merge scene config into each value/label/plot (inherit font, font_size, etc.)
        let scene_snapshot = raw["scene"].clone();
        for key in &["values", "labels", "plots"] {
            if let Some(items) = raw[key].as_array_mut() {
                for item in items.iter_mut() {
                    merge_scene_into_item(&scene_snapshot, item);
                }
            }
        }

        serde_json::from_value(raw)
    }
}

fn merge_scene_into_item(scene: &serde_json::Value, item: &mut serde_json::Value) {
    if let (Some(scene_obj), Some(item_obj)) = (scene.as_object(), item.as_object_mut()) {
        for (k, v) in scene_obj {
            item_obj.entry(k).or_insert_with(|| v.clone());
        }
    }
}

/// Multiply a numeric field in place, keeping it a float (for f32 fields).
fn scale_f(obj: &mut serde_json::Value, key: &str, factor: f64) {
    if let Some(n) = obj.get(key).and_then(|v| v.as_f64()) {
        obj[key] = serde_json::json!(n * factor);
    }
}

/// Multiply a numeric field in place, rounding to an integer (for u32/i32
/// fields — serde_json rejects a float where an integer is expected).
fn scale_i(obj: &mut serde_json::Value, key: &str, factor: f64) {
    if let Some(n) = obj.get(key).and_then(|v| v.as_f64()) {
        obj[key] = serde_json::json!((n * factor).round() as i64);
    }
}

/// Scale every spatial field of a raw template by `factor`. Non-spatial
/// fields (colors, fonts, opacity, units, fps, decimal_rounding, fractional
/// margins) are resolution-independent and left untouched.
fn scale_template(raw: &mut serde_json::Value, factor: f64, tw: u32, th: u32) {
    if let Some(scene) = raw.get_mut("scene") {
        scene["width"] = serde_json::json!(tw);
        scene["height"] = serde_json::json!(th);
        scale_f(scene, "font_size", factor);
    }

    for key in &["values", "labels"] {
        if let Some(items) = raw.get_mut(key).and_then(|v| v.as_array_mut()) {
            for item in items {
                scale_f(item, "x", factor);
                scale_f(item, "y", factor);
                scale_f(item, "font_size", factor);
            }
        }
    }

    if let Some(plots) = raw.get_mut("plots").and_then(|v| v.as_array_mut()) {
        for plot in plots {
            scale_i(plot, "x", factor);
            scale_i(plot, "y", factor);
            scale_i(plot, "width", factor);
            scale_i(plot, "height", factor);
            if let Some(line) = plot.get_mut("line") {
                scale_f(line, "width", factor);
            }
            if let Some(pl) = plot.get_mut("point_label") {
                scale_f(pl, "font_size", factor);
                scale_f(pl, "x_offset", factor);
                scale_f(pl, "y_offset", factor);
            }
            if let Some(points) = plot.get_mut("points").and_then(|v| v.as_array_mut()) {
                for p in points {
                    scale_f(p, "weight", factor);
                }
            }
        }
    }
}
