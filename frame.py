from datetime import timedelta

from PIL import Image, ImageDraw, ImageFont

import constant


class Frame:
    def __init__(self, filename, path, width, height):
        self.filename = filename
        self.path = path
        img = Image.new("RGBA", (width, height))
        img.save(f"{self.path}/{self.filename}")

    def full_path(self):
        return f"{self.path}/{self.filename}"

    def draw_value(self, value: str, config: dict):
        def draw_value_helper(text, color, x, y, font_size, font="fonts/Evogria.otf"):
            # todo - check if font can be none or just set a default that isnt' evogria
            font = ImageFont.truetype(f"fonts/{font}", font_size)
            img = Image.open(self.full_path())
            ImageDraw.Draw(img).text((x, y), text, font=font, fill=color)
            img.save(self.full_path())

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

    def draw(self, configs):
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
                        self.draw_value(value, config["imperial"])
                    if "metric" in config.keys():
                        value = getattr(self, attribute)
                        if attribute == constant.ATTR_SPEED:
                            value *= constant.KMH_CONVERSION
                        self.draw_value(value, config["metric"])
                else:
                    value = getattr(self, attribute)
                    if attribute == constant.ATTR_COURSE:
                        self.draw_course(config)
                    elif attribute == constant.ATTR_ELEVATION:
                        self.draw_profile(config)
                    else:
                        if attribute == constant.ATTR_TIME:
                            # TODO - try to use timezone instead of offset
                            value += timedelta(hours=config["hours_offset"])
                            value = value.strftime(config["format"])
                        self.draw_value(value, config)
        for label in self.labels:
            if "hide" not in label.keys() or not label["hide"]:
                self.draw_value(label["text"], label)

    def draw_course(self, config):
        course = Image.open(f"{self.path}/course/{self.filename}")
        frame = Image.open(self.full_path())
        angle = config["rotation"]
        course = course.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        frame.paste(course, (config["x"], config["y"]), course)
        frame.save(self.full_path())

    def draw_profile(self, config):
        course = Image.open(f"{self.path}/profile/{self.filename}")
        frame = Image.open(self.full_path())
        angle = config["rotation"]
        course = course.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        frame.paste(course, (config["x"], config["y"]), course)
        frame.save(self.full_path())
