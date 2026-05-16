/// Per-frame Skia rendering — draws one video frame to a raw RGBA byte buffer.
use serde::Serialize;
use skia_safe::{Canvas, Color, Font, FontMgr, FontStyle, ISize, ImageInfo, Paint, Typeface};
use std::collections::HashMap;

use crate::render::activity::{
    Activity, ATTR_ELEVATION, ATTR_SPEED, ATTR_TEMPERATURE, FT_CONVERSION, KMH_CONVERSION,
    MPH_CONVERSION,
};
use crate::render::chart::ChartCache;
use crate::render::color::hex_with_opacity;
use crate::render::template::{LabelConfig, Template, ValueConfig};

/// Pixel-perfect bounding box for a single overlay element in overlay coordinates.
#[derive(Debug, Clone, Serialize)]
pub struct ElementBounds {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

/// Measure every element in the template for the given frame, returning pixel-perfect
/// bounding boxes using the same Skia font metrics used to render.
pub fn measure_elements(
    frame_idx: usize,
    activity: &Activity,
    template: &Template,
    fonts_dir: &str,
) -> Vec<ElementBounds> {
    let mut bounds = Vec::new();

    for (i, label) in template.labels.iter().enumerate() {
        let font_name = label
            .font
            .as_deref()
            .or(template.scene.font.as_deref())
            .unwrap_or("Arial.ttf");
        let font_size = label.font_size.or(template.scene.font_size).unwrap_or(32.0);
        if let Some(font) = load_font(font_name, font_size, fonts_dir) {
            let (_, rect) = font.measure_str(&label.text, None);
            bounds.push(ElementBounds {
                id: format!("label-{i}"),
                x: label.x + rect.left,
                y: label.y + rect.top,
                w: rect.width(),
                h: rect.height(),
            });
        }
    }

    for (i, val_cfg) in template.values.iter().enumerate() {
        let attr = &val_cfg.value;
        let raw = if activity.valid_attributes.contains(attr) {
            activity.get_scalar(attr, frame_idx)
        } else {
            0.0
        };
        let text = format_value(raw, val_cfg);
        let font_name = val_cfg
            .font
            .as_deref()
            .or(template.scene.font.as_deref())
            .unwrap_or("Arial.ttf");
        let font_size = val_cfg
            .font_size
            .or(template.scene.font_size)
            .unwrap_or(32.0);
        if let Some(font) = load_font(font_name, font_size, fonts_dir) {
            let (_, rect) = font.measure_str(&text, None);
            bounds.push(ElementBounds {
                id: format!("value-{i}"),
                x: val_cfg.x + rect.left,
                y: val_cfg.y + rect.top,
                w: rect.width(),
                h: rect.height(),
            });
        }
    }

    for (i, plot) in template.plots.iter().enumerate() {
        bounds.push(ElementBounds {
            id: format!("plot-{i}"),
            x: plot.x as f32,
            y: plot.y as f32,
            w: plot.width as f32,
            h: plot.height as f32,
        });
    }

    bounds
}

/// All pre-computed data that stays constant across frames.
pub struct SceneCache {
    /// Pre-rendered base frame as an immutable Skia Image.
    /// Stored as Image (not raw bytes) to avoid a heap allocation + 8 MB copy on every frame.
    pub base_image: skia_safe::Image,
    /// One ChartCache per plot attribute that has a dynamic position marker.
    pub charts: HashMap<String, ChartCache>,
    pub width: u32,
    pub height: u32,
    /// Pre-loaded typefaces keyed by filename. Eliminates disk I/O inside the per-frame
    /// hot path — Font::new(typeface.clone(), size) is trivially cheap.
    pub typefaces: HashMap<String, Typeface>,
}

impl SceneCache {
    pub fn build(
        activity: &Activity,
        template: &Template,
        fonts_dir: &str,
    ) -> Result<Self, String> {
        let w = template.scene.width;
        let h = template.scene.height;

        // --- Pre-load all typefaces referenced by value elements ---
        let mut typefaces: HashMap<String, Typeface> = HashMap::new();
        for val_cfg in &template.values {
            let font_name = val_cfg
                .font
                .as_deref()
                .or(template.scene.font.as_deref())
                .unwrap_or("Arial.ttf")
                .to_string();
            typefaces.entry(font_name.clone()).or_insert_with(|| {
                load_typeface(&font_name, fonts_dir).expect("failed to load typeface")
            });
        }

        // --- Build chart caches ---
        let mut charts = HashMap::new();
        for plot_cfg in &template.plots {
            if !plot_cfg.has_position_markers() {
                continue; // static plots handled in base frame
            }
            let (x_data, y_data) = activity.plot_data(&plot_cfg.value);
            if let Some(cache) = ChartCache::build(plot_cfg, x_data, y_data) {
                charts.insert(plot_cfg.value.clone(), cache);
            }
        }

        // --- Pre-render base frame as a Skia Image ---
        // Contains: transparent background + static labels + static (no-marker) plots.
        let base_image = render_base_frame(w, h, template, activity, fonts_dir)?;

        Ok(SceneCache {
            base_image,
            charts,
            width: w,
            height: h,
            typefaces,
        })
    }
}

/// Render a single video frame and return raw RGBA bytes.
pub fn render_frame(
    frame_idx: usize,
    cache: &SceneCache,
    activity: &Activity,
    template: &Template,
) -> Vec<u8> {
    let w = cache.width as i32;
    let h = cache.height as i32;

    let info = ImageInfo::new(
        ISize::new(w, h),
        skia_safe::ColorType::BGRA8888,
        skia_safe::AlphaType::Premul,
        None,
    );
    let mut surface = skia_safe::surfaces::raster(&info, None, None).expect("Skia surface");
    let canvas = surface.canvas();

    // 1. Blit pre-rendered base frame (static labels + static charts).
    //    Drawing an Image reference — no extra allocation or byte copy.
    canvas.draw_image(&cache.base_image, (0, 0), None);

    // 2. Composite dynamic charts (cached background + position marker).
    for chart in cache.charts.values() {
        chart.draw_on_canvas(canvas, frame_idx);
    }

    // 3. Draw dynamic value text (speed, HR, elevation, etc.).
    for val_cfg in &template.values {
        let attr = &val_cfg.value;
        if !activity.valid_attributes.contains(attr) {
            continue;
        }
        let raw = activity.get_scalar(attr, frame_idx);
        let display = format_value(raw, val_cfg);
        draw_text_on_canvas(canvas, &display, val_cfg, template, &cache.typefaces);
    }

    // 4. Extract raw RGBA bytes.
    let mut pixels = vec![0u8; (w * h * 4) as usize];
    let row_bytes = (w * 4) as usize;
    surface.read_pixels(&info, &mut pixels, row_bytes, skia_safe::IPoint::new(0, 0));
    pixels
}

// ─── Base frame pre-renderer ───────────────────────────────────────────────

fn render_base_frame(
    w: u32,
    h: u32,
    template: &Template,
    activity: &Activity,
    fonts_dir: &str,
) -> Result<skia_safe::Image, String> {
    let info = ImageInfo::new(
        ISize::new(w as i32, h as i32),
        skia_safe::ColorType::BGRA8888,
        skia_safe::AlphaType::Premul,
        None,
    );
    let mut surface = skia_safe::surfaces::raster(&info, None, None)
        .ok_or("Failed to create base frame surface")?;
    let canvas = surface.canvas();
    canvas.clear(Color::TRANSPARENT);

    // Static labels
    for label in &template.labels {
        draw_label(canvas, label, template, fonts_dir);
    }

    // Static plots (those without position markers)
    for plot_cfg in &template.plots {
        if plot_cfg.has_position_markers() {
            continue; // dynamic charts handled per-frame
        }
        let (x_data, y_data) = activity.plot_data(&plot_cfg.value);
        if let Some(chart) = crate::render::chart::ChartCache::build(plot_cfg, x_data, y_data) {
            canvas.draw_image(
                &chart.background,
                skia_safe::Point::new(chart.x_offset as f32, chart.y_offset as f32),
                None,
            );
        }
    }

    Ok(surface.image_snapshot())
}

// ─── Text rendering ────────────────────────────────────────────────────────

fn draw_text_on_canvas(
    canvas: &Canvas,
    text: &str,
    cfg: &ValueConfig,
    template: &Template,
    typefaces: &HashMap<String, Typeface>,
) {
    let font_name = cfg
        .font
        .as_deref()
        .or(template.scene.font.as_deref())
        .unwrap_or("Arial.ttf");
    let font_size = cfg.font_size.or(template.scene.font_size).unwrap_or(32.0);
    let color_str = cfg.color.as_deref().unwrap_or("#ffffff");

    let (r, g, b, a) = hex_with_opacity(color_str, cfg.opacity);
    let color = Color::from_argb(a, r, g, b);

    if let Some(tf) = typefaces.get(font_name) {
        let font = Font::new(tf.clone(), font_size);
        let mut paint = Paint::default();
        paint.set_anti_alias(true);
        paint.set_color(color);
        canvas.draw_str(text, (cfg.x, cfg.y), &font, &paint);
    }
}

fn draw_label(canvas: &Canvas, label: &LabelConfig, template: &Template, fonts_dir: &str) {
    let font_name = label
        .font
        .as_deref()
        .or(template.scene.font.as_deref())
        .unwrap_or("Arial.ttf");
    let font_size = label.font_size.or(template.scene.font_size).unwrap_or(32.0);
    let color_str = label.color.as_deref().unwrap_or("#ffffff");
    let (r, g, b, a) = hex_with_opacity(color_str, label.opacity);
    let color = Color::from_argb(a, r, g, b);

    if let Some(font) = load_font(font_name, font_size, fonts_dir) {
        let mut paint = Paint::default();
        paint.set_anti_alias(true);
        paint.set_color(color);
        canvas.draw_str(&label.text, (label.x, label.y), &font, &paint);
    }
}

fn load_typeface(font_name: &str, fonts_dir: &str) -> Option<Typeface> {
    let mgr = FontMgr::default();
    let path = format!("{fonts_dir}/{font_name}");
    if let Ok(bytes) = std::fs::read(&path) {
        let data = skia_safe::Data::new_copy(&bytes);
        if let Some(tf) = mgr.new_from_data(&data, None) {
            return Some(tf);
        }
    }
    let family = font_name.trim_end_matches(".ttf").trim_end_matches(".TTF");
    mgr.match_family_style(family, FontStyle::normal())
}

fn load_font(font_name: &str, size: f32, fonts_dir: &str) -> Option<Font> {
    load_typeface(font_name, fonts_dir).map(|tf| Font::new(tf, size))
}

// ─── Value formatting ──────────────────────────────────────────────────────

fn format_value(raw: f64, cfg: &ValueConfig) -> String {
    let mut v = raw;

    // Unit conversion — default to metric when no unit is specified.
    // GPX speed is in m/s, elevation in metres, temperature in °C.
    let imperial = cfg.unit.as_deref() == Some("imperial");
    match cfg.value.as_str() {
        ATTR_SPEED => {
            v *= if imperial {
                MPH_CONVERSION
            } else {
                KMH_CONVERSION
            };
        }
        ATTR_ELEVATION => {
            if imperial {
                v *= FT_CONVERSION;
            }
        }
        ATTR_TEMPERATURE => {
            if imperial {
                v = v * 1.8 + 32.0;
            }
        }
        _ => {}
    }

    // Decimal rounding
    let text = match cfg.decimal_rounding {
        Some(0) => format!("{}", v.round() as i64),
        Some(n) if n > 0 => format!("{:.prec$}", v, prec = n as usize),
        _ => format!("{}", v.round() as i64),
    };

    // Suffix
    match &cfg.suffix {
        Some(s) => format!("{text}{s}"),
        None => text,
    }
}
