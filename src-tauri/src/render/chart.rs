/// Chart rendering with Skia — the core performance optimization.
///
/// Pre-renders an entire chart to a cached Image once at scene init.
/// Per-frame cost is then: one image blit + one circle draw.
/// This replaces matplotlib's plt.savefig() which was 50–200ms per frame.
use skia_safe::{Canvas, Color, ISize, ImageInfo, Paint, PaintStyle, PathBuilder, Point};

use crate::render::color::to_skia_color;
use crate::render::template::PlotConfig;

/// Pixel bounds of the data area inside a chart surface (excluding margins).
#[derive(Debug, Clone)]
pub struct PlotBounds {
    pub left: f32,
    pub right: f32,
    pub top: f32,
    pub bottom: f32,
}

impl PlotBounds {
    pub fn width(&self) -> f32 {
        self.right - self.left
    }
    pub fn height(&self) -> f32 {
        self.bottom - self.top
    }
}

/// Geographic coordinate mapping for course/GPS plots.
/// Pre-computes the cos(lat) correction and a uniform scale with letterbox offsets
/// so the rendered track preserves real geographic proportions.
#[derive(Debug, Clone)]
pub struct GeoMapping {
    pub x_min: f64,
    pub y_min: f64,
    pub cos_lat: f64,
    pub scale: f32,
    /// Letterbox offsets (pixels) so the track is centered within the plot area.
    pub x_off: f32,
    pub y_off: f32,
}

impl GeoMapping {
    fn build(x_min: f64, x_max: f64, y_min: f64, y_max: f64, plot: &PlotBounds) -> Option<Self> {
        let lon_extent = x_max - x_min;
        let lat_extent = y_max - y_min;
        if lon_extent <= 0.0 || lat_extent <= 0.0 {
            return None;
        }
        let mean_lat = (y_min + y_max) / 2.0;
        let cos_lat = mean_lat.to_radians().cos();
        let lon_px = lon_extent * cos_lat;
        let scale = (plot.width() as f64 / lon_px).min(plot.height() as f64 / lat_extent) as f32;
        let x_off = (plot.width() - lon_px as f32 * scale) / 2.0;
        let y_off = (plot.height() - lat_extent as f32 * scale) / 2.0;
        Some(GeoMapping {
            x_min,
            y_min,
            cos_lat,
            scale,
            x_off,
            y_off,
        })
    }

    fn to_pixel(&self, x: f64, y: f64, plot: &PlotBounds) -> Point {
        let px = plot.left + self.x_off + ((x - self.x_min) * self.cos_lat) as f32 * self.scale;
        let py = plot.bottom - self.y_off - (y - self.y_min) as f32 * self.scale;
        Point::new(px, py)
    }
}

/// Immutable, pre-rendered chart background plus the coordinate mapping needed
/// to draw the per-frame position marker.
pub struct ChartCache {
    /// Rendered chart background without any position markers.
    pub background: skia_safe::Image,
    /// X data (frame indices or lon values).
    pub x_data: Vec<f64>,
    /// Y data (elevation, lat, etc.).
    pub y_data: Vec<f64>,
    /// Pixel position of the chart within the full frame.
    pub x_offset: i32,
    pub y_offset: i32,
    /// Data min/max for mapping data coords → pixel coords.
    pub x_min: f64,
    pub x_max: f64,
    pub y_min: f64,
    pub y_max: f64,
    /// Pixel bounds of the plot area inside the surface.
    pub plot_bounds: PlotBounds,
    /// Point configs from the template (colour, size, etc.).
    pub point_configs: Vec<crate::render::template::PointConfig>,
    /// Geographic mapping for course plots (None for non-GPS charts).
    pub geo: Option<GeoMapping>,
}

impl ChartCache {
    pub fn build(config: &PlotConfig, x_data: Vec<f64>, y_data: Vec<f64>) -> Option<Self> {
        if x_data.is_empty() || y_data.is_empty() {
            return None;
        }

        let surf_w = config.width as i32;
        let surf_h = config.height as i32;
        if surf_w <= 0 || surf_h <= 0 {
            return None;
        }

        let margin = config.margin_fraction();
        let is_course = config.value == crate::render::activity::ATTR_COURSE;
        // Course plots keep the margin inset so the route line and position dot
        // don't clip at the surface edge. Non-course plots (elevation, etc.) go
        // edge-to-edge so their bounding box aligns exactly with the rendered pixels.
        let plot_bounds = if is_course {
            let m = margin as f32;
            PlotBounds {
                left: m * surf_w as f32,
                right: surf_w as f32 - m * surf_w as f32,
                top: m * surf_h as f32,
                bottom: surf_h as f32 - m * surf_h as f32,
            }
        } else {
            PlotBounds {
                left: 0.0,
                right: surf_w as f32,
                top: 0.0,
                bottom: surf_h as f32,
            }
        };

        let x_min = x_data.iter().cloned().fold(f64::INFINITY, f64::min);
        let x_max = x_data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let y_min = y_data.iter().cloned().fold(f64::INFINITY, f64::min);
        let y_max = y_data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

        // Course plots use geographic aspect-ratio correction; all others get vertical padding.
        let is_course = config.value == crate::render::activity::ATTR_COURSE;
        let geo = if is_course {
            GeoMapping::build(x_min, x_max, y_min, y_max, &plot_bounds)
        } else {
            None
        };

        // Add some vertical padding so the line doesn't hug the top/bottom edges.
        let y_pad = (y_max - y_min) * margin;
        let (y_min_out, y_max_out) = if is_course {
            (y_min, y_max)
        } else {
            (y_min - y_pad, y_max + y_pad)
        };

        let background = render_chart_background(
            surf_w,
            surf_h,
            &plot_bounds,
            &x_data,
            &y_data,
            &DataBounds {
                x_min,
                x_max,
                y_min: y_min_out,
                y_max: y_max_out,
            },
            config,
            geo.as_ref(),
        );

        Some(ChartCache {
            background,
            x_data,
            y_data,
            x_offset: config.x,
            y_offset: config.y,
            x_min,
            x_max,
            y_min: y_min_out,
            y_max: y_max_out,
            plot_bounds,
            point_configs: config.points.clone().unwrap_or_default(),
            geo,
        })
    }

    /// Map a data coordinate to a pixel position inside the chart surface.
    fn data_to_pixel(&self, x: f64, y: f64) -> Point {
        if let Some(geo) = &self.geo {
            return geo.to_pixel(x, y, &self.plot_bounds);
        }
        let px = self.plot_bounds.left
            + if self.x_max > self.x_min {
                ((x - self.x_min) / (self.x_max - self.x_min)) as f32 * self.plot_bounds.width()
            } else {
                0.0
            };
        let py = self.plot_bounds.bottom
            - if self.y_max > self.y_min {
                ((y - self.y_min) / (self.y_max - self.y_min)) as f32 * self.plot_bounds.height()
            } else {
                0.0
            };
        Point::new(px, py)
    }

    /// Draw onto a canvas: blit background then draw position marker for frame_idx.
    pub fn draw_on_canvas(&self, canvas: &Canvas, frame_idx: usize) {
        // 1. Composite the cached chart background.
        canvas.draw_image(
            &self.background,
            Point::new(self.x_offset as f32, self.y_offset as f32),
            None,
        );

        // 2. Draw position marker (the per-frame part).
        if frame_idx < self.x_data.len() {
            let x = self.x_data[frame_idx];
            let y = self.y_data.get(frame_idx).copied().unwrap_or(0.0);
            let local_pt = self.data_to_pixel(x, y);
            let abs_pt = Point::new(
                local_pt.x + self.x_offset as f32,
                local_pt.y + self.y_offset as f32,
            );

            for pc in &self.point_configs {
                let color = pc
                    .color
                    .as_deref()
                    .map(|c| to_skia_color(c, pc.opacity))
                    .unwrap_or(Color::WHITE);
                let radius = pc.weight.unwrap_or(80.0).sqrt() / 2.0; // weight is area → r = sqrt(w)/2

                let mut paint = Paint::default();
                paint.set_anti_alias(true);
                paint.set_color(color);
                paint.set_style(PaintStyle::Fill);
                canvas.draw_circle(abs_pt, radius, &paint);

                // Optionally draw edge stroke
                if pc.remove_edge_color.unwrap_or(false) {
                    // no edge
                } else if let Some(ec) = &pc.edge_color {
                    let mut ep = Paint::default();
                    ep.set_anti_alias(true);
                    ep.set_color(to_skia_color(ec, None));
                    ep.set_style(PaintStyle::Stroke);
                    ep.set_stroke_width(1.0);
                    canvas.draw_circle(abs_pt, radius, &ep);
                }
            }
        }
    }
}

// ─── Background renderer ──────────────────────────────────────────────────

struct DataBounds {
    x_min: f64,
    x_max: f64,
    y_min: f64,
    y_max: f64,
}

#[allow(clippy::too_many_arguments)]
fn render_chart_background(
    surf_w: i32,
    surf_h: i32,
    plot_bounds: &PlotBounds,
    x_data: &[f64],
    y_data: &[f64],
    bounds: &DataBounds,
    config: &PlotConfig,
    geo: Option<&GeoMapping>,
) -> skia_safe::Image {
    let DataBounds {
        x_min,
        x_max,
        y_min,
        y_max,
    } = *bounds;
    let info = ImageInfo::new(
        ISize::new(surf_w, surf_h),
        skia_safe::ColorType::BGRA8888,
        skia_safe::AlphaType::Premul,
        None,
    );
    let mut surface =
        skia_safe::surfaces::raster(&info, None, None).expect("Failed to create Skia surface");
    let canvas = surface.canvas();
    canvas.clear(Color::TRANSPARENT);

    let to_px = |x: f64, y: f64| -> Point {
        if let Some(g) = geo {
            return g.to_pixel(x, y, plot_bounds);
        }
        let px = plot_bounds.left
            + if x_max > x_min {
                ((x - x_min) / (x_max - x_min)) as f32 * plot_bounds.width()
            } else {
                0.0
            };
        let py = plot_bounds.bottom
            - if y_max > y_min {
                ((y - y_min) / (y_max - y_min)) as f32 * plot_bounds.height()
            } else {
                0.0
            };
        Point::new(px, py)
    };

    // Build the line path using PathBuilder (Path is immutable in skia-safe 0.93+)
    let mut pb = PathBuilder::new();
    for (i, (&x, &y)) in x_data.iter().zip(y_data.iter()).enumerate() {
        let pt = to_px(x, y);
        if i == 0 {
            pb.move_to(pt);
        } else {
            pb.line_to(pt);
        }
    }
    let line_path = pb.snapshot();

    // Draw fill under the curve
    if let Some(fill_opacity) = config.fill_opacity() {
        let fill_color_str = config.fill_color();
        let (r, g, b, _) = crate::render::color::parse_hex_color(&fill_color_str);
        let alpha = (fill_opacity.clamp(0.0, 1.0) * 255.0) as u8;
        let fill_color = Color::from_argb(alpha, r, g, b);

        let y_base = y_min;
        if let (Some(&last_x), Some(&first_x)) = (x_data.last(), x_data.first()) {
            let mut fb = PathBuilder::new_path(&line_path);
            fb.line_to(to_px(last_x, y_base));
            fb.line_to(to_px(first_x, y_base));
            fb.close();
            let fill_path = fb.snapshot();

            let mut paint = Paint::default();
            paint.set_anti_alias(true);
            paint.set_color(fill_color);
            paint.set_style(PaintStyle::Fill);
            canvas.draw_path(&fill_path, &paint);
        }
    }

    // Draw the line
    let line_color = to_skia_color(&config.line_color(), None);
    let mut line_paint = Paint::default();
    line_paint.set_anti_alias(true);
    line_paint.set_color(line_color);
    line_paint.set_stroke_width(config.line_width());
    line_paint.set_style(PaintStyle::Stroke);
    canvas.draw_path(&line_path, &line_paint);

    surface.image_snapshot()
}
