import math
import os
import shutil
import subprocess

import matplotlib.pyplot as plt
from moviepy.editor import *

from config import build_config
from frame import Frame


class Scene:
    def __init__(self, gpx, attributes, path=f"{os.path.dirname(__file__)}/tmp"):
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

    # warning: quicktime_compatible codec produces nearly x5 larger file
    def export_video(self, output_file="out.mov", quicktime_compatible=False):
        codec = "prores_ks" if quicktime_compatible else "png"
        pixel_format = "yuva444p10le" if quicktime_compatible else "rgba"
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
                codec,
                "-pix_fmt",
                pixel_format,
                "-y",
                output_file,
            ]
        )
        self.delete_frames()
        if quicktime_compatible:
            subprocess.call(["open", output_file])
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

    # add multiprocessing here
    def build_frames(self):
        # TODO should build all gpx lists here in one pass - parse attributes
        frames = []
        if "course" in self.attributes:
            self.gpx.set_lat_lon_ele()
            course_config = build_config("course")
            plt.rcParams["lines.linewidth"] = course_config["line_width"]
            # plot connected line width plt.figure(figsize=(width, height))
            # todo - configure line color
            plt.axis("off")
            plt.plot(self.gpx.lon, self.gpx.lat)
            num_seconds = len(self.gpx.lat)
            num_seconds = 2  # TODO - change after debugging
            num_frames = num_seconds * self.video_config["fps"]
            self.set_frame_digits(num_frames)
            print("building frames")
            for second in range(num_seconds):
                print(f"{second + 1}/{num_seconds}")
                lat, lon, ele = (
                    self.gpx.lat[second],
                    self.gpx.lon[second],
                    self.gpx.ele[second],
                )
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
                        ele,
                    )
                    plt.savefig(frame.filename, transparent=True)
                    frame.draw_attributes(self.attributes)
                    frames.append(frame)
                scatter.remove()
        else:
            # TODO build blank frames if don't want course
            pass
        return frames
