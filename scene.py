import math
import os
import shutil
import subprocess
from subprocess import PIPE, Popen

import numpy as np
from tqdm import tqdm

import constant
from config import config_dicts
from frame import Frame
from plot import build_figure


class Scene:
    def __init__(
        self,
        activity,
        valid_attributes,
        config_filename,
    ):
        self.activity = activity
        self.attributes = valid_attributes
        self.configs = config_dicts(config_filename)
        self.fps = self.configs["scene"]["fps"]
        self.labels = self.configs["labels"]
        self.activity.interpolate(self.fps)
        self.config_scene()
        self.build_figures()
        self.frames = []

    def render_video(self):
        self.build_frames()
        self.export_video()

    def render_demo(self, second):
        self.build_frame(second, 0)
        self.draw_frames()
        # TODO is there a better way to close plots on the fly?
        import matplotlib.pyplot as plt

        plt.close("all")

    def update_configs(self, config_filename):
        self.configs = config_dicts(config_filename)

    def draw_frames(self):
        if not os.path.exists(constant.FRAMES_DIR):
            os.makedirs(constant.FRAMES_DIR)
        for frame in tqdm(self.frames):
            frame.draw(self.configs, self.figs).save(frame.full_path())

    def config_scene(self):
        self.seconds = len(self.activity.time)

    def build_figures(self):
        self.figs = {}
        self.figs[constant.ATTR_COURSE] = build_figure(
            self.configs[constant.ATTR_COURSE],
            [ele[1] for ele in self.activity.course],
            [ele[0] for ele in self.activity.course],
        )
        ele_x = [
            ii
            for ii in range(
                len(self.activity.elevation) * len(self.activity.elevation[0])
            )
        ]
        ele_y = np.array(sum(self.activity.elevation, []))
        self.figs[constant.ATTR_ELEVATION] = build_figure(
            self.configs[constant.ATTR_ELEVATION]["profile"], ele_x, ele_y
        )

    # warning: quicktime_compatible codec produces nearly x5 larger file
    def export_video(self):
        output_filename = self.configs["scene"]["output_filename"]
        quicktime_compatible = self.configs["scene"]["quicktime_compatible"]
        less_verbose = ["-loglevel", "warning"]
        framerate = ["-r", str(self.fps)]
        fmt = ["-f", "image2pipe"]
        input_files = ["-i", "-"]
        codec = ["-c:v", "prores_ks"] if quicktime_compatible else ["-c:v", "png"]
        pixel_format = (
            ["-pix_fmt", "yuva444p10le"]
            if quicktime_compatible
            else ["-pix_fmt", "rgba"]
        )
        output = ["-y", output_filename]
        p = Popen(
            ["ffmpeg"]
            + less_verbose
            + framerate
            + fmt
            + input_files
            + codec
            + pixel_format
            + output,
            stdin=PIPE,
        )

        for frame in tqdm(self.frames):
            frame.draw(self.configs, self.figs).save(p.stdin, "PNG")

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
        for attribute in self.attributes:
            if attribute in constant.NO_INTERPOLATE_ATTRIBUTES:
                attribute_data[attribute] = getattr(self.activity, attribute)[second]
            else:
                attribute_data[attribute] = getattr(self.activity, attribute)[second][
                    frame_number
                ]
        return attribute_data

    def build_frame(self, second, frame_number):
        num_frames = self.seconds * self.fps
        frame_digits = int(math.log10(num_frames - 2)) + 1
        frame = Frame(
            f"{str(second * self.fps + frame_number).zfill(frame_digits)}.png",
            self.configs["scene"]["width"],
            self.configs["scene"]["height"],
            second,
            frame_number,
        )
        frame.attributes = self.attributes
        frame.labels = self.labels
        frame_data = self.frame_attribute_data(second, frame_number)
        for attribute in frame.attributes:
            setattr(frame, attribute, frame_data[attribute])
        self.frames.append(frame)

    def build_frames(self):
        for second in range(self.seconds):
            for frame_number in range(self.fps):
                self.build_frame(second, frame_number)
