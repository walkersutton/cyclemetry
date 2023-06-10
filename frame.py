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

    def draw_attributes(self, attributes, configs):
        for attribute in attributes:
            config = configs[attribute]
            value = getattr(self, attribute)
            if attribute == constant.ATTR_TIME:
                # TODO - try to use timezone instead of offset
                value += timedelta(hours=config["hours_offset"])
                value = value.strftime("%H:%M:%S")
            value = str(value)
            suffix = config["suffix"]
            if suffix:
                value += suffix
            # TODO need to consider units here - imperial vs metric
            # do this in config
            self.draw_text(
                value,
                config["text_color"],
                config["x"],
                config["y"],
                config["font_size"],
                config["font"],
            )
