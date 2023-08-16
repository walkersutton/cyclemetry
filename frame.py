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
        def draw_value_helper(text, color, x, y, font_size, font="arial.ttf"):
            if not os.path.exists(font):
                font = constant.FONTS_DIR + font
            font = ImageFont.truetype(font, font_size)
            ImageDraw.Draw(img).text(
                (x, y), text, font=font, fill=ImageColor.getcolor(color, "RGBA")
            )

        if type(value) in (int, float):
            if "round" in config.keys():
                if config["round"] == 0:
                    value = int(value)
                else:
                    value = round(
                        float(value), config["round"]
                    )  # TODO - should pad right side with 0s so less jumpy suffix
        value = str(value)
        if "suffix" in config.keys():
            value += config["suffix"]
        draw_value_helper(
            value,
            config["color"],
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
            text = self.profile_label_text(config["point_label"])
        plot_img, buffer = build_image(figure, config, x, y, text)

        angle = config["rotation"]
        if angle != 0:
            plot_img = plot_img.rotate(
                angle, resample=Image.Resampling.BICUBIC, expand=True
            )
        img.paste(plot_img, (config["x"], config["y"]), plot_img)
        buffer.close()  # faster to not close the buffer? maybe just small sample size - seems like better practice to close though, so let's for now
        return img

    def draw(self, configs, figures):
        img = Image.new("RGBA", (self.width, self.height))
        for attribute in self.attributes:
            config = configs[attribute]
            if "hide" not in config.keys() or not config["hide"]:
                if any(elem in config.keys() for elem in {"imperial", "metric"}):
                    if "imperial" in config.keys():
                        value = getattr(self, attribute)
                        if attribute == constant.ATTR_SPEED:
                            value *= constant.MPH_CONVERSION
                        elif attribute == constant.ATTR_ELEVATION:
                            value *= constant.FT_CONVERSION
                        img = self.draw_value(img, value, config["imperial"])
                    if "metric" in config.keys():
                        value = getattr(self, attribute)
                        if attribute == constant.ATTR_SPEED:
                            value *= constant.KMH_CONVERSION
                        img = self.draw_value(img, value, config["metric"])
                else:
                    value = getattr(self, attribute)
                    if attribute == constant.ATTR_COURSE:
                        img = self.draw_figure(
                            img, config, attribute, figures[attribute]
                        )
                    elif attribute == constant.ATTR_ELEVATION:
                        img = self.draw_figure(
                            img,
                            config["profile"],
                            attribute,
                            figures[attribute],
                            fps=configs["scene"]["fps"],
                        )
                    else:
                        if attribute == constant.ATTR_TIME:
                            # TODO - try to use timezone instead of offset
                            value += timedelta(hours=config["hours_offset"])
                            value = value.strftime(config["format"])
                        img = self.draw_value(img, value, config)
        for label in self.labels:
            if "hide" not in label.keys() or not label["hide"]:
                img = self.draw_value(img, label["text"], label)
        return img

    def profile_label_text(self, config):
        text = ""
        for unit in config["units"]:
            value = self.elevation * constant.ELEVATION_CONVERSION_MAP[unit]
            if "round" in config.keys():
                if config["round"] == 0:
                    value = int(value)
                else:
                    value = round(float(value), config["round"])
            text += (
                f"{value}{constant.DEFAULT_SUFFIX_MAP[constant.ATTR_ELEVATION][unit]}\n"
            )
        return text.rstrip()
