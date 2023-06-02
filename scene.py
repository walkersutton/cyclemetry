import os

import matplotlib.pyplot as plt
from moviepy.editor import *

from config import build_config
from frame import Frame


class Scene:
    def __init__(self, gpx, attributes, path=f"{os.path.dirname(__file__)}/scene_dir"):
        self.gpx = gpx
        self.attributes = attributes
        self.path = path
        # TODO use tmp dir/ tmp file instead of using folder
        self.frames = build_frames(gpx, path, self.attributes)
        # now_string = ''.join(str(datetime.now()).split())
        # frame_dir = f'{os.path.dirname(__file__)}/{now_string}'

    def paint_frames(self, attributes):
        for (
            frame
        ) in (
            self.frames
        ):  # will probably need to multiply the # of frames by fps to smooth numbers
            for attribute in attributes:
                # frame.draw_text(text, color, x, y) # this color might need to be a x3 tuple
                pass

    def export_video(self, auto_open=True, frame_duration=1):
        config = build_config("video")
        # TODO - transparent background
        # TODO - modify default frame_duration
        export_filename = "final.mp4"
        clips = [
            ImageClip(frame.filename).set_duration(frame_duration)
            for frame in self.frames
        ]
        concatenate_videoclips(clips, method="compose").write_videofile(
            export_filename, fps=config["fps"]
        )
        if auto_open:
            os.system("open final.mp4")


def build_frames(gpx, path, attributes):
    frames = []
    if "course" in attributes:
        config = build_config("course")
        latitude, longitude = gpx.lat_lon()
        plt.rcParams["lines.linewidth"] = config["line_width"]
        # plot connected line width plt.figure(figsize=(width, height))
        # todo - configure line color
        plt.axis("off")
        plt.plot(longitude, latitude)
        # for ii in range(len(latitude)): TODO UNCOMMENT LATER
        for ii in range(20):
            # todo - put point on top of line - rather than below the line
            lat, lon = latitude[ii], longitude[ii]
            frame = Frame(f"{path}/{ii}.png", lat, lon)
            scatter = plt.scatter(
                x=[lon],
                y=[lat],
                color=config[
                    "primary_color"
                ],  # TODO - might need to do something about hex/tuple color conversions
                s=config["point_weight"],
            )
            plt.savefig(frame.filename, transparent=True)
            scatter.remove()
            frames.append(frame)
        return frames
    else:
        # TODO build blank frames if don't want course
        pass
    return frames
