import math
import os
import subprocess
from subprocess import PIPE, Popen

import numpy as np
from tqdm import tqdm

import constant
from frame import Frame
from plot import build_figure
from template import build_configs


class Scene:
    def __init__(self, activity, template):
        self.activity = activity
        self.template = template
        self.fps = self.template["scene"]["fps"]
        if "labels" in self.template.keys():
            self.labels = self.template["labels"]
        else:
            self.labels = []
        self.frames = []

    def render_video(self, seconds):
        self.build_frames(seconds)
        self.export_video()

    def render_demo(self, seconds, second):
        self.build_frame(seconds, second, 0)
        self.draw_frames()
        # TODO is there a better way to close plots on the fly?
        import matplotlib.pyplot as plt

        plt.close("all")

    def update_configs(self, config_filename):
        self.template = build_configs(config_filename)

    def draw_frames(self):
        if not os.path.exists(constant.FRAMES_DIR):
            os.makedirs(constant.FRAMES_DIR)
        if not hasattr(self, "figs"):
            self.figs = None
        for frame in tqdm(self.frames, dynamic_ncols=True):
            frame.draw(self.template, self.figs).save(frame.full_path())

    def build_figures(self):
        def figure_data(attribute):
            x, y = None, None
            match attribute:
                case constant.ATTR_COURSE:
                    x = [ele[1] for ele in self.activity.course]
                    y = [ele[0] for ele in self.activity.course]
                case constant.ATTR_ELEVATION:
                    x = [ii for ii in range(len(self.activity.elevation))]
                    y = self.activity.elevation
                case _:
                    print("you fucked up")
            return x, y

        if "plots" in self.template.keys():
            self.figs = {}
            for config in self.template["plots"]:
                x, y = figure_data(config["value"])
                self.figs[config["value"]] = build_figure(config, x, y)

    # warning: quicktime_compatible codec produces nearly x5 larger file
    def export_video(self):
        output_filename = self.template["scene"]["output_filename"]
        quicktime_compatible = self.template["scene"]["quicktime_compatible"]
        width, height = (
            self.template["scene"]["width"],
            self.template["scene"]["height"],
        )
        less_verbose = ["-loglevel", "warning"]
        framerate = ["-r", str(self.fps)]
        fmt = ["-f", "rawvideo"]
        input_files = ["-i", "-"]
        codec = ["-c:v", "prores_ks"]  # helps with transparency
        pixel_format = ["-pix_fmt", "rgba"]
        size = ["-s", f"{width}x{height}"]
        output = ["-y", output_filename]
        p = Popen(
            ["ffmpeg"]
            + less_verbose
            + fmt
            + size
            + pixel_format
            + framerate
            + input_files
            + codec
            + output,
            stdin=PIPE,
        )
        # TODO optimization opportunity here?
        for frame in tqdm(self.frames, dynamic_ncols=True):
            image = frame.draw(self.template, self.figs)
            p.stdin.write(image.tobytes())

        p.stdin.close()
        p.wait()

        if quicktime_compatible:
            subprocess.call(["open", output_filename])

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

    def frame_attribute_data(self, second: int, frame_number: int):
        attribute_data = {}
        valid_attributes = self.activity.valid_attributes
        for attribute in valid_attributes:
            if attribute in constant.NO_INTERPOLATE_ATTRIBUTES:
                attribute_data[attribute] = getattr(self.activity, attribute)[second]
            else:
                attribute_data[attribute] = getattr(self.activity, attribute)[
                    second * self.fps + frame_number
                ]
        return attribute_data

    def build_frame(self, seconds, second, frame_number):
        num_frames = seconds * self.fps
        frame_digits = int(math.log10(num_frames - 2)) + 1
        frame = Frame(
            f"{str(second * self.fps + frame_number).zfill(frame_digits)}.png",
            self.template["scene"]["width"],
            self.template["scene"]["height"],
            second,
            frame_number,
        )
        valid_attributes = self.activity.valid_attributes
        frame.valid_attributes = valid_attributes
        # frame.labels = self.labels
        frame_data = self.frame_attribute_data(second, frame_number)
        for attribute in frame.valid_attributes:
            setattr(frame, attribute, frame_data[attribute])
        self.frames.append(frame)

    def build_frames(self, seconds):
        for second in range(seconds):
            for frame_number in range(self.fps):
                self.build_frame(seconds, second, frame_number)
