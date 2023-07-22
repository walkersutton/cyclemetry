import os
from datetime import timedelta

from PIL import Image, ImageColor, ImageDraw, ImageFont

import constant


class Frame:
    def __init__(self, filename, path, width, height):
        self.filename = filename
        self.path = path
        self.width = width
        self.height = height

    def full_path(self):
        return f"{self.path}/{self.filename}"

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

    def draw_asset(self, img, config, attribute):
        asset = Image.open(f"{self.path}/{attribute}/{self.filename}")
        angle = config["rotation"]
        asset = asset.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        img.paste(asset, (config["x"], config["y"]), asset)
        return img

    def draw(self, configs):
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
                        img = self.draw_asset(img, config, attribute)
                    elif attribute == constant.ATTR_ELEVATION:
                        img = self.draw_asset(img, config["profile"], attribute)
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
