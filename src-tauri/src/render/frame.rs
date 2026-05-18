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
use crate::render::template::{LabelConfig, LayerElement, PlotConfig, Template, ValueConfig};

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
    /// One ChartCache per plot index.
    pub charts: Vec<Option<ChartCache>>,
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

        // --- Pre-load all typefaces referenced by text elements ---
        let mut typefaces: HashMap<String, Typeface> = HashMap::new();
        for font_name in template
            .values
            .iter()
            .map(|v| {
                v.font
                    .as_deref()
                    .or(template.scene.font.as_deref())
                    .unwrap_or("Arial.ttf")
                    .to_string()
            })
            .chain(template.labels.iter().map(|l| {
                l.font
                    .as_deref()
                    .or(template.scene.font.as_deref())
                    .unwrap_or("Arial.ttf")
                    .to_string()
            }))
        {
            typefaces.entry(font_name.clone()).or_insert_with(|| {
                load_typeface(&font_name, fonts_dir).expect("failed to load typeface")
            });
        }

        // --- Build chart caches ---
        let mut charts: Vec<Option<ChartCache>> = std::iter::repeat_with(|| None)
            .take(template.plots.len())
            .collect();
        for (idx, plot_cfg) in template.plots.iter().enumerate() {
            let (x_data, y_data) = activity.plot_data(&plot_cfg.value);
            if let Some(cache) = ChartCache::build(plot_cfg, x_data, y_data, fonts_dir) {
                charts[idx] = Some(cache);
            }
        }

        // --- Pre-render transparent base frame as a Skia Image ---
        let base_image = render_base_frame(w, h)?;

        Ok(SceneCache {
            base_image,
            charts,
            width: w,
            height: h,
            typefaces,
        })
    }
}

/// Rectangular sub-region of the full overlay frame, in overlay pixel coords.
/// When a render is cropped to the union of all visible elements, only this
/// window is rasterised + piped + encoded — the rest is fully transparent and
/// pure overhead. `x`/`y` is the placement offset the compositor needs.
#[derive(Debug, Clone, Copy, Serialize)]
pub struct CropRect {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

/// Render a single video frame and return raw BGRA bytes.
///
/// `crop`: when `Some`, the surface is sized to the crop window and the canvas
/// is translated so all absolute-coordinate draws (base image, charts, text)
/// land correctly while only the window is captured. `None` = full frame
/// (preview path).
pub fn render_frame(
    frame_idx: usize,
    cache: &SceneCache,
    activity: &Activity,
    template: &Template,
    crop: Option<&CropRect>,
) -> Vec<u8> {
    let (w, h, ox, oy) = match crop {
        Some(c) => (c.w as i32, c.h as i32, c.x, c.y),
        None => (cache.width as i32, cache.height as i32, 0, 0),
    };

    let info = ImageInfo::new(
        ISize::new(w, h),
        skia_safe::ColorType::BGRA8888,
        skia_safe::AlphaType::Premul,
        None,
    );
    let row_bytes = (w * 4) as usize;

    // Composite straight into the output buffer: wrap a raster surface around
    // `pixels` so Skia draws in place. This drops both the surface's separate
    // backing-store allocation and the full-frame read_pixels copy the old
    // raster()+read_pixels path paid every frame. Render is fully hidden behind
    // encode, so this is a memory-traffic / allocator-churn win, not a speedup.
    // A fresh vec is zeroed = transparent BGRA; the base image covers the whole
    // crop window, so no explicit clear is needed.
    let mut pixels = vec![0u8; (h as usize) * row_bytes];
    {
        let mut surface =
            skia_safe::surfaces::wrap_pixels(&info, &mut pixels, Some(row_bytes), None)
                .expect("Skia surface");
        let canvas = surface.canvas();

        // Shift the world so the crop window maps to (0,0); all draw calls
        // below keep using absolute overlay coordinates unchanged.
        if ox != 0 || oy != 0 {
            canvas.translate((-ox as f32, -oy as f32));
        }

        // 1. Blit transparent base frame.
        //    Drawing an Image reference — no extra allocation or byte copy.
        canvas.draw_image(&cache.base_image, (0, 0), None);

        // 2. Draw all elements back-to-front according to scene.layers.
        for layer in template.layer_order() {
            match layer {
                LayerElement::Label(idx) => {
                    if let Some(label) = template.labels.get(idx) {
                        draw_label(canvas, label, template, &cache.typefaces, "");
                    }
                }
                LayerElement::Value(idx) => {
                    if let Some(val_cfg) = template.values.get(idx) {
                        draw_value(
                            canvas,
                            val_cfg,
                            template,
                            activity,
                            frame_idx,
                            &cache.typefaces,
                        );
                    }
                }
                LayerElement::Plot(idx) => {
                    if let Some(plot_cfg) = template.plots.get(idx) {
                        draw_plot(canvas, plot_cfg, idx, frame_idx, cache);
                    }
                }
            }
        }
    } // surface dropped here → releases the &mut pixels borrow

    pixels
}

/// Union bounding box of every element that is ever drawn, across all frames.
///
/// Plots/labels are static; value text changes width frame-to-frame, so values
/// are measured at every frame (cheap: one cached `Font` per config). The box
/// is padded, clamped to the frame, and rounded to even dimensions. Returns
/// `None` when the box covers ≥95% of the frame (cropping wouldn't pay off) or
/// there is nothing to draw — callers fall back to the full-frame path.
pub fn compute_crop_rect(
    activity: &Activity,
    template: &Template,
    fonts_dir: &str,
) -> Option<CropRect> {
    let fw = template.scene.width as f32;
    let fh = template.scene.height as f32;

    let (mut min_x, mut min_y) = (f32::INFINITY, f32::INFINITY);
    let (mut max_x, mut max_y) = (f32::NEG_INFINITY, f32::NEG_INFINITY);
    let mut acc = |x0: f32, y0: f32, x1: f32, y1: f32| {
        min_x = min_x.min(x0);
        min_y = min_y.min(y0);
        max_x = max_x.max(x1);
        max_y = max_y.max(y1);
    };

    // Plots: fixed rect (may extend off-frame; clamped later).
    // Rotated plots are bounded by their circumscribed circle.
    for p in &template.plots {
        let rot = p.rotation.unwrap_or(0.0);
        if rot != 0.0 {
            let cx = p.x as f32 + p.width as f32 / 2.0;
            let cy = p.y as f32 + p.height as f32 / 2.0;
            let r = ((p.width as f32).powi(2) + (p.height as f32).powi(2)).sqrt() / 2.0;
            acc(cx - r, cy - r, cx + r, cy + r);
        } else {
            acc(
                p.x as f32,
                p.y as f32,
                (p.x as f32) + p.width as f32,
                (p.y as f32) + p.height as f32,
            );
        }
    }

    // Static labels.
    for label in &template.labels {
        let name = label
            .font
            .as_deref()
            .or(template.scene.font.as_deref())
            .unwrap_or("Arial.ttf");
        let size = label.font_size.or(template.scene.font_size).unwrap_or(32.0);
        if let Some(font) = load_font(name, size, fonts_dir) {
            let (_, r) = font.measure_str(&label.text, None);
            acc(
                label.x + r.left,
                label.y + r.top,
                label.x + r.right,
                label.y + r.bottom,
            );
        }
    }

    // Dynamic values: build the Font once per config, measure every frame.
    let n = activity.data_len();
    for vc in &template.values {
        if !activity.valid_attributes.contains(&vc.value) {
            continue;
        }
        let name = vc
            .font
            .as_deref()
            .or(template.scene.font.as_deref())
            .unwrap_or("Arial.ttf");
        let size = vc.font_size.or(template.scene.font_size).unwrap_or(32.0);
        let Some(font) = load_font(name, size, fonts_dir) else {
            continue;
        };
        for i in 0..n {
            let text = format_value(activity.get_scalar(&vc.value, i), vc);
            let (_, r) = font.measure_str(&text, None);
            acc(vc.x + r.left, vc.y + r.top, vc.x + r.right, vc.y + r.bottom);
        }
    }

    if !min_x.is_finite() || !max_x.is_finite() || max_x <= min_x || max_y <= min_y {
        return None;
    }

    // Pad, clamp to frame, round origin down / extent up to even dimensions.
    const PAD: f32 = 16.0;
    let x0 = (min_x - PAD).floor().max(0.0);
    let y0 = (min_y - PAD).floor().max(0.0);
    let x1 = (max_x + PAD).ceil().min(fw);
    let y1 = (max_y + PAD).ceil().min(fh);

    let x = x0 as i32 & !1;
    let y = y0 as i32 & !1;
    let w = (((x1 as i32) - x).max(2) as u32 + 1) & !1;
    let h = (((y1 as i32) - y).max(2) as u32 + 1) & !1;
    let w = w.min(template.scene.width - x as u32);
    let h = h.min(template.scene.height - y as u32);

    // Not worth the contract change if the box is essentially the whole frame.
    if (w as f32 * h as f32) >= 0.95 * fw * fh {
        return None;
    }

    Some(CropRect { x, y, w, h })
}

// ─── Base frame pre-renderer ───────────────────────────────────────────────

fn render_base_frame(w: u32, h: u32) -> Result<skia_safe::Image, String> {
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

    Ok(surface.image_snapshot())
}

fn draw_value(
    canvas: &Canvas,
    val_cfg: &ValueConfig,
    template: &Template,
    activity: &Activity,
    frame_idx: usize,
    typefaces: &HashMap<String, Typeface>,
) {
    let attr = &val_cfg.value;
    if !activity.valid_attributes.contains(attr) {
        return;
    }
    let raw = activity.get_scalar(attr, frame_idx);
    let display = format_value(raw, val_cfg);
    draw_text_on_canvas(canvas, &display, val_cfg, template, typefaces);
}

fn draw_plot(
    canvas: &Canvas,
    plot_cfg: &PlotConfig,
    idx: usize,
    frame_idx: usize,
    cache: &SceneCache,
) {
    let Some(Some(chart)) = cache.charts.get(idx) else {
        return;
    };
    let rotation = plot_cfg.rotation.unwrap_or(0.0);
    if rotation != 0.0 {
        let cx = plot_cfg.x as f32 + plot_cfg.width as f32 / 2.0;
        let cy = plot_cfg.y as f32 + plot_cfg.height as f32 / 2.0;
        canvas.save();
        canvas.rotate(rotation, Some(skia_safe::Point::new(cx, cy)));
    }
    if plot_cfg.has_position_markers() {
        chart.draw_on_canvas(canvas, frame_idx);
    } else {
        canvas.draw_image(
            &chart.background,
            skia_safe::Point::new(chart.x_offset as f32, chart.y_offset as f32),
            None,
        );
    }
    if rotation != 0.0 {
        canvas.restore();
    }
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

fn draw_label(
    canvas: &Canvas,
    label: &LabelConfig,
    template: &Template,
    typefaces: &HashMap<String, Typeface>,
    fonts_dir: &str,
) {
    let font_name = label
        .font
        .as_deref()
        .or(template.scene.font.as_deref())
        .unwrap_or("Arial.ttf");
    let font_size = label.font_size.or(template.scene.font_size).unwrap_or(32.0);
    let color_str = label.color.as_deref().unwrap_or("#ffffff");
    let (r, g, b, a) = hex_with_opacity(color_str, label.opacity);
    let color = Color::from_argb(a, r, g, b);

    let font = typefaces
        .get(font_name)
        .map(|tf| Font::new(tf.clone(), font_size))
        .or_else(|| load_font(font_name, font_size, fonts_dir));
    if let Some(font) = font {
        let mut paint = Paint::default();
        paint.set_anti_alias(true);
        paint.set_color(color);
        canvas.draw_str(&label.text, (label.x, label.y), &font, &paint);
    }
}

pub(crate) fn load_typeface(font_name: &str, fonts_dir: &str) -> Option<Typeface> {
    let mgr = FontMgr::default();
    // Bundled fonts first, then user-installed custom fonts.
    let candidates = [
        std::path::PathBuf::from(format!("{fonts_dir}/{font_name}")),
        crate::fonts_user_dir().join(font_name),
    ];
    for path in candidates {
        if let Ok(bytes) = std::fs::read(&path) {
            let data = skia_safe::Data::new_copy(&bytes);
            if let Some(tf) = mgr.new_from_data(&data, None) {
                return Some(tf);
            }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::render::activity::Activity;
    use crate::render::template::Template;

    /// Minimal synthetic GPX: a short track with moving position + varying
    /// elevation so course/elevation plots and values all have real extents.
    fn synthetic_gpx() -> String {
        let mut s = String::from(r#"<?xml version="1.0"?><gpx><trk><trkseg>"#);
        for i in 0..40 {
            let lat = 37.0 + i as f64 * 0.001;
            let lon = -122.0 + i as f64 * 0.0012;
            let ele = 100.0 + (i as f64 * 7.0);
            let t = format!("2026-01-01T00:{:02}:{:02}Z", i / 60, i % 60);
            s.push_str(&format!(
                "<trkpt lat=\"{lat}\" lon=\"{lon}\"><ele>{ele}</ele><time>{t}</time>\
                 <extensions><TrackPointExtension><hr>{}</hr><cad>{}</cad>\
                 </TrackPointExtension></extensions></trkpt>",
                120 + i,
                80 + (i % 10)
            ));
        }
        s.push_str("</trkseg></trk></gpx>");
        s
    }

    #[test]
    fn crop_rect_is_a_valid_subregion_of_localized_template() {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let tmpl_path = format!("{manifest}/../templates/safa_brian.json");
        let fonts_dir = format!("{manifest}/../resources/fonts");

        let raw: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&tmpl_path).unwrap()).unwrap();
        let template = Template::from_value(raw).unwrap();

        let mut activity = Activity::parse_gpx(&synthetic_gpx()).unwrap();
        activity.interpolate(template.scene.fps);

        let crop = compute_crop_rect(&activity, &template, &fonts_dir)
            .expect("localized template should yield a crop");

        let (fw, fh) = (template.scene.width, template.scene.height);
        // Inside the frame.
        assert!(crop.x >= 0 && crop.y >= 0, "origin negative: {crop:?}");
        assert!(
            crop.x as u32 + crop.w <= fw && crop.y as u32 + crop.h <= fh,
            "crop {crop:?} exceeds {fw}x{fh}"
        );
        // Even dimensions (codec requirement).
        assert!(crop.w % 2 == 0 && crop.h % 2 == 0, "odd dims: {crop:?}");
        // Actually smaller than the full frame (the whole point).
        let frac = (crop.w as f64 * crop.h as f64) / (fw as f64 * fh as f64);
        assert!(frac < 0.95, "crop not a meaningful subregion: {frac:.2}");
    }

    /// Exercises the wrap_pixels path end-to-end: Skia must composite into the
    /// caller-owned buffer (not a detached surface). A correctly drawn frame
    /// from a template with visible elements is the right size and not blank.
    #[test]
    fn render_frame_composites_into_the_returned_buffer() {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let tmpl_path = format!("{manifest}/../templates/safa_brian.json");
        let fonts_dir = format!("{manifest}/../resources/fonts");

        let raw: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&tmpl_path).unwrap()).unwrap();
        let template = Template::from_value(raw).unwrap();

        let mut activity = Activity::parse_gpx(&synthetic_gpx()).unwrap();
        activity.interpolate(template.scene.fps);

        let cache = SceneCache::build(&activity, &template, &fonts_dir).unwrap();
        let crop = compute_crop_rect(&activity, &template, &fonts_dir).unwrap();

        let buf = render_frame(0, &cache, &activity, &template, Some(&crop));

        assert_eq!(
            buf.len(),
            crop.w as usize * crop.h as usize * 4,
            "buffer size must match the crop window"
        );
        // wrap_pixels drew into *this* buffer: a template with a course plot +
        // labels must leave some non-transparent (non-zero) pixels.
        assert!(
            buf.iter().any(|&b| b != 0),
            "frame is entirely blank — Skia did not composite into the buffer"
        );
    }
}
