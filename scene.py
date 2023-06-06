import math
import os
import shutil
import subprocess

import matplotlib.pyplot as plt
from moviepy.editor import *

from config import build_config
from frame import Frame


class Scene:
    def __init__(self, gpx, attributes, path=f"{os.path.dirname(__file__)}/scene_dir"):
        self.gpx = gpx
        self.attributes = attributes
        self.path = path  # TODO use tmp dir/ tmp file instead of using folder
        os.makedirs(self.path)
        self.video_config = build_config("video")
        self.frame_digits = None  # set when building frames
        self.frames = self.build_frames()

        # now_string = ''.join(str(datetime.now()).split())
        # frame_dir = f'{os.path.dirname(__file__)}/{now_string}'

    def set_frame_digits(self, num_frames):
        self.frame_digits = int(math.log10(num_frames - 2)) + 1

    def paint_frames(self, attributes):
        for (
            frame
        ) in (
            self.frames
        ):  # will probably need to multiply the # of frames by fps to smooth numbers
            for attribute in attributes:
                # frame.draw_text(text, color, x, y) # this color might need to be a x3 tuple
                pass

    def delete_frames(self):
        shutil.rmtree(self.path)

    def export_video(self, output_file="out.mov"):
        less_verbose = ["-loglevel", "warning"]
        subprocess.call(
            ["ffmpeg"]
            + less_verbose
            + [
                "-r",
                str(self.video_config["fps"]),
                "-f",
                "image2",
                "-i",
                f"{self.path}/%0{self.frame_digits}d.png",
                "-c:v",
                "png",
                "-pix_fmt",
                "rgba",
                "-y",
                output_file,
            ]
        )
        self.delete_frames()
        # TODO - try to not depend on ffmpeg subprocess call please
        # clips = [
        #     ImageClip(frame.filename, transparent=True).set_duration(frame_duration)
        #     for frame in self.frames
        # ]
        # concatenate_videoclips(clips, method="compose").write_videofile(
        #     export_filename,
        #     codec="mpeg4",
        #     ffmpeg_params=["-pix_fmt", "yuv420p"],
        #     fps=config["fps"],
        # )

    def build_frames(self):
        frames = []
        if "course" in self.attributes:
            latitude, longitude = self.gpx.lat_lon()
            course_config = build_config("course")
            plt.rcParams["lines.linewidth"] = course_config["line_width"]
            # plot connected line width plt.figure(figsize=(width, height))
            # todo - configure line color
            plt.axis("off")
            plt.plot(longitude, latitude)
            num_seconds = len(latitude)
            num_seconds = 5  # TODO - change after debugging
            num_frames = num_seconds * self.video_config["fps"]
            self.set_frame_digits(num_frames)
            for second in range(num_seconds):
                lat, lon = latitude[second], longitude[second]
                scatter = plt.scatter(
                    x=[lon],
                    y=[lat],
                    color=course_config[
                        "primary_color"
                    ],  # TODO - might need to do something about hex/tuple color conversions
                    s=course_config["point_weight"],
                )
                for ii in range(self.video_config["fps"]):
                    # todo - put point on top of line - rather than below the line
                    frame = Frame(
                        f"{self.path}/{str(second * self.video_config['fps'] + ii).zfill(self.frame_digits)}.png",
                        lat,
                        lon,
                    )
                    plt.savefig(frame.filename, transparent=True)
                    frames.append(frame)
                scatter.remove()
        else:
            # TODO build blank frames if don't want course
            pass
        return frames
