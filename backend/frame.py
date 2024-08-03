import os
from datetime import timedelta

from PIL import Image, ImageColor, ImageDraw, ImageFont

import constant
from plot import build_image


class Frame:
    def __init__(self, filename, width, height, second, frame_number):
        self.filename = filename
        self.width = width
        self.height = height
        self.second = second
        self.frame_number = frame_number

    def full_path(self):
        return f"{constant.FRAMES_DIR}{self.filename}"

    def draw_value(self, img, value: str, config: dict):
        def draw_value_helper(text, color, x, y, font_size, font="Arial.ttf"):
            if not os.path.exists(font):
                font = constant.FONTS_DIR + font
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

        if type(value) in (int, float):
            if "decimal_rounding" in config.keys():
                if config["decimal_rounding"] == 0:
                    value = int(value)
                else:
                    value = round(
                        float(value), config["decimal_rounding"]
                    )  # TODO - should pad right side with 0s so less jumpy suffix
        value = str(value)
        if "suffix" in config.keys():
            value += config["suffix"]
        draw_value_helper(
            value,
            hex_color_with_alpha(
                config["color"],
                config["opacity"] if "opacity" in config.keys() else None,
            ),
            config["x"],
            config["y"],
            config["font_size"],
            config["font"],
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

    def draw(self, configs, figures):
        def convert_value(value, attribute, config):
            unit = config["unit"]
            match attribute:
                case constant.ATTR_SPEED:
                    if unit == constant.UNIT_IMPERIAL:
                        value *= constant.MPH_CONVERSION
                    elif unit == constant.UNIT_METRIC:
                        value *= constant.KMH_CONVERSION
                    else:
                        print("wtf is that unit")
                case constant.ATTR_ELEVATION:
                    if unit == "imperial":
                        value *= constant.FT_CONVERSION
                    elif unit == "metric":
                        pass
                    else:
                        print("wtf is that unit")
                case constant.ATTR_TIME:
                    # TODO - try to use timezone instead of offset. maybe? idk if this is a good TODO
                    hours_offset = config["hours_offset"]
                    time_format = config["time_format"]
                    value += timedelta(hours=hours_offset)
                    value = value.strftime(time_format)
            return value

        img = Image.new("RGBA", (self.width, self.height))
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
                    img = self.draw_value(img, value, config)
        if "labels" in configs.keys():
            for config in configs["labels"]:
                # TODO probably can get rid of storing labels on the frame if all info we need is in config
                # also, this is static, so probably don't need to do this work N times if copying is more performant
                # for label in self.labels:
                img = self.draw_value(img, config["text"], config)
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
