from datetime import timedelta

from PIL import Image, ImageDraw, ImageFont

import constant


class Frame:
    def __init__(self, filename):
        self.filename = filename

    def draw_text(self, text, color, x, y, font_size, font="fonts/Evogria.otf"):
        # todo - check if font can be none or just set a default that isnt' evogria
        font = ImageFont.truetype(f"fonts/{font}", font_size)
        img = Image.open(self.filename)
        ImageDraw.Draw(img).text((x, y), text, font=font, fill=color)
        img.save(self.filename)

    def draw_course_outline(self, course_config):
        shape = [
            (course_config["x1"], course_config["y1"]),
            (course_config["x2"], course_config["y2"]),
        ]
        img = Image.open(self.filename)
        ImageDraw.Draw(img).rectangle(shape, outline="red")  # do i need a fill?
        img.save(self.filename)

    def draw_attribute(self, value: str, config: dict):
        if "suffix" in config.keys():
            value += config["suffix"]
        self.draw_text(
            value,
            config["text_color"],
            config["x"],
            config["y"],
            config["font_size"],
            config["font"],
        )

    def draw_attributes(self, configs):
        for attribute in self.attributes:
            config = configs[attribute]
            if any(elem in config.keys() for elem in {"imperial", "metric"}):
                if "imperial" in config.keys():
                    # TODO - conversion
                    value = str(getattr(self, attribute))
                    self.draw_attribute(value, config["imperial"])
                if "metric" in config.keys():
                    # TODO - conversion
                    value = str(getattr(self, attribute))
                    self.draw_attribute(value, config["imperial"])
            elif not config["hide"]:
                value = getattr(self, attribute)
                if attribute == constant.ATTR_TIME:
                    # TODO - try to use timezone instead of offset
                    value += timedelta(hours=config["hours_offset"])
                    value = value.strftime(config["format"])
                value = str(value)
                self.draw_attribute(value, config)
