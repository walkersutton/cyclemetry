import os
from datetime import timedelta

import constant
from PIL import Image, ImageColor, ImageDraw, ImageFont
from plot import build_image


class Frame:
    def __init__(self, filename, width, height, second, frame_number):
        self.filename = filename
        self.width = width
        self.height = height
        self.second = second
        self.frame_number = frame_number

    def full_path(self):
        return f"{constant.FRAMES_DIR()}{self.filename}"

    def draw_value(self, img, value: str, config: dict, scene_config: dict = None):
        def draw_value_helper(text, color, x, y, font_size, font="Arial.ttf"):
            if not os.path.exists(font):
                font = constant.FONTS_DIR() + font
            font = ImageFont.truetype(font, font_size)
            ImageDraw.Draw(img).text(
                (x, y), text, font=font, fill=ImageColor.getcolor(color, "RGBA")
            )

        def hex_color_with_alpha(color, opacity):
            if opacity is None:
                return color
            int_value = round(opacity * 255)
            hex_string = f"{int_value:02x}"
            return color + hex_string

        # Get decimal_rounding from config or scene_config
        decimal_rounding = config.get("decimal_rounding")
        if decimal_rounding is None and scene_config:
            decimal_rounding = scene_config.get("decimal_rounding")

        if type(value) in (int, float):
            if decimal_rounding is not None:
                if decimal_rounding == 0:
                    value = int(value)
                else:
                    value = round(
                        float(value), decimal_rounding
                    )  # TODO - should pad right side with 0s so less jumpy suffix
        value = str(value)
        if "suffix" in config.keys():
            value += config["suffix"]

        # Get font from config or scene_config
        font = config.get("font")
        if font is None and scene_config:
            font = scene_config.get("font", "Arial.ttf")
        else:
            font = font or "Arial.ttf"

        # Get font size from config or scene_config
        font_size = config.get("font_size")
        if font_size is None and scene_config:
            font_size = scene_config.get("font_size", 32)
        else:
            font_size = font_size or 32

        draw_value_helper(
            value,
            hex_color_with_alpha(
                config.get("color", constant.DEFAULT_COLOR),
                config["opacity"] if "opacity" in config.keys() else None,
            ),
            config["x"],
            config["y"],
            font_size,
            font,
        )
        return img

    def draw_figure(self, img, config, attribute, figure, fps=None):
        if attribute == constant.ATTR_COURSE:
            (
                y,
                x,
            ) = self.course
            text = None
        elif attribute == constant.ATTR_ELEVATION:
            x = self.second * fps + self.frame_number
            y = self.elevation
            text = (
                self.profile_label_text(config["point_label"])
                if "point_label" in config
                else ""
            )
        plot_img, buffer = build_image(figure, config, x, y, text)

        if "rotation" in config.keys():
            angle = config["rotation"]
            if angle != 0:
                plot_img = plot_img.rotate(
                    angle, resample=Image.Resampling.BICUBIC, expand=True
                )
        img.paste(plot_img, (config["x"], config["y"]), plot_img)
        buffer.close()  # faster to not close the buffer? maybe just small sample size - seems like better practice to close though, so let's for now
        return img

    def draw(self, configs, figures, base_image=None, plot_backgrounds=None):
        """
        Draw the frame. If base_image is provided (with static labels),
        it will be used as a starting point. If plot_backgrounds is provided,
        those will be composited with dynamic position markers.
        """

        def convert_value(value, attribute, config):
            unit = config["unit"]
            match attribute:
                case constant.ATTR_SPEED:
                    if unit == constant.UNIT_IMPERIAL:
                        value *= constant.MPH_CONVERSION
                    elif unit == constant.UNIT_METRIC:
                        value *= constant.KMH_CONVERSION
                    else:
                        raise ValueError(f"Unknown unit: {unit}")
                case constant.ATTR_ELEVATION:
                    if unit == "imperial":
                        value *= constant.FT_CONVERSION
                    elif unit == "metric":
                        pass
                    else:
                        raise ValueError(f"Unknown unit: {unit}")
                case constant.ATTR_TIME:
                    # TODO - try to use timezone instead of offset. maybe? idk if this is a good TODO
                    hours_offset = config["hours_offset"]
                    time_format = config["time_format"]
                    value += timedelta(hours=hours_offset)
                    value = value.strftime(time_format)
            return value

        # Use base_image if provided, otherwise create new
        if base_image is not None:
            img = base_image.copy()
        else:
            img = Image.new("RGBA", (self.width, self.height))

        scene_config = configs.get("scene", {})

        # Only draw dynamic values, skip labels and plots if base_image provided
        if "values" in configs.keys():
            for config in configs["values"]:
                attribute = config["value"]
                if attribute in self.valid_attributes:
                    value = getattr(self, attribute)
                    if (
                        "unit" in config.keys()
                        or ("hours_offset" and "time_format") in config.keys()
                    ):
                        value = convert_value(value, attribute, config)
                    img = self.draw_value(img, value, config, scene_config)

        # Only draw static elements if no base_image provided
        if base_image is None:
            if "labels" in configs.keys():
                for config in configs["labels"]:
                    img = self.draw_value(img, config["text"], config, scene_config)
            if "plots" in configs.keys():
                for config in configs["plots"]:
                    attribute = config["value"]
                    img = self.draw_figure(
                        img,
                        config,
                        attribute,
                        figures[attribute],
                        fps=configs["scene"]["fps"],
                    )
        else:
            # Composite plot backgrounds with position markers
            if plot_backgrounds:
                for attribute, (plot_bg, plot_config) in plot_backgrounds.items():
                    # Paste the cached background
                    img.paste(plot_bg, (0, 0), plot_bg)
                    # Now draw only the position markers
                    img = self.draw_figure(
                        img,
                        plot_config,
                        attribute,
                        figures[attribute],
                        fps=configs["scene"]["fps"],
                    )
        return img

    def profile_label_text(self, config):
        text = ""
        for unit in config["units"]:
            value = self.elevation * constant.ELEVATION_CONVERSION_MAP[unit]
            if "decimal_rounding" in config.keys():
                if config["decimal_rounding"] == 0:
                    value = int(value)
                else:
                    value = round(float(value), config["decimal_rounding"])
            text += (
                f"{value}{constant.DEFAULT_SUFFIX_MAP[constant.ATTR_ELEVATION][unit]}\n"
            )
        return text.rstrip()
