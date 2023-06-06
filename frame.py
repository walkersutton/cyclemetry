from PIL import Image, ImageDraw, ImageFont


class Frame:
    def __init__(
        self,
        filename,
        lat=None,
        lon=None,
        elevation=None,
        cadence=None,
        heartrate=None,
        power=None,
        temperature=None,
    ):
        self.filename = filename
        self.lat = lat
        self.lon = lon
        self.elevation = elevation
        self.heartrate = heartrate
        self.power = power
        self.temperature = temperature

    def draw_text(self, text, color, x, y, font_size=40, font="fonts/Evogria.otf"):
        # TODO - fix default x,y,...
        font = ImageFont.truetype(font, font_size)
        img = Image.open(self.filename)
        ImageDraw.Draw(img).text((x, y), text, font=font, fill=color)
        img.save(self.filename)

    def draw_attributes(self, attributes):
        # for attribute in attributes:
        self.draw_text(
            str(int(self.elevation * 3.28084)),
            "#ffffff",
            3,
            350,
            font="fonts/Furore.otf",
        )
        self.draw_text(f"{round(self.lat, 4)}, {round(self.lon, 4)}", "#ffffff", 3, 30)
