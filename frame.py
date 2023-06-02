from PIL import Image, ImageDraw


class Frame:
    def __init__(
        self,
        filename,
        lat=None,
        lon=None,
        cadence=None,
        heartrate=None,
        power=None,
        temperature=None,
    ):
        self.filename = filename
        self.lat = lat
        self.lon = lon
        self.heartrate = heartrate
        self.power = power
        self.temperature = temperature

    def draw_text(self, text, color, x, y):
        # TODO - fix default x,y,...
        # custom font can go here
        img = Image.open(self.filename)
        ImageDraw.Draw(img).text((x, y), text, fill=color)
        img.save(self.filename)
