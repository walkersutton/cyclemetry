import math
import json
import os
import shutil
import subprocess
from subprocess import PIPE, Popen

import numpy as np
from tqdm import tqdm

import constant
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
        self.template = template_dicts(config_filename)
        self.fps = self.template["scene"]["fps"]
        self.labels = self.template["labels"]
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
        self.template = template_dicts(config_filename)

    def draw_frames(self):
        if not os.path.exists(constant.FRAMES_DIR):
            os.makedirs(constant.FRAMES_DIR)
        for frame in tqdm(self.frames, dynamic_ncols=True):
            frame.draw(self.template, self.figs).save(frame.full_path())

    def build_figures(self):
        self.figs = {}
        self.figs[constant.ATTR_COURSE] = build_figure(
            self.template[constant.ATTR_COURSE],
            [ele[1] for ele in self.activity.course],
            [ele[0] for ele in self.activity.course],
        )
        self.figs[constant.ATTR_ELEVATION] = build_figure(
            self.template[constant.ATTR_ELEVATION]["profile"],
            [ii for ii in range(len(self.activity.elevation))],
            self.activity.elevation,
        )

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
        for attribute in self.attributes:
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
        frame.attributes = self.attributes
        frame.labels = self.labels
        frame_data = self.frame_attribute_data(second, frame_number)
        for attribute in frame.attributes:
            setattr(frame, attribute, frame_data[attribute])
        self.frames.append(frame)

    def build_frames(self, seconds):
        for second in range(seconds):
            for frame_number in range(self.fps):
                self.build_frame(seconds, second, frame_number)


def raw_template(filename):
    with open(f"templates/{filename}", "r") as file:
        return json.load(file)


def template_dicts(filename):
    # configs = raw_template(filename) TODO just for templates in tmp folder
    # TODO CLEAN
    configs = None
    # TODO improve filename path finding here
    filename = "./../templates/" + filename
    with open(filename, "r") as file:
        configs = json.load(file)
    # TODO CLEAN
    global_config = configs["global"]
    for attribute in configs.keys():
        if type(configs[attribute]) == dict:
            for key, value in global_config.items():
                if key not in configs[attribute].keys():
                    configs[attribute][key] = value
            if any(
                elem in configs[attribute].keys()
                for elem in {"sub_point", "imperial", "metric"}
            ):
                if "imperial" in configs[attribute].keys():
                    for key, value in global_config.items():
                        if key not in configs[attribute]["imperial"].keys():
                            configs[attribute]["imperial"][key] = value
                if "metric" in configs[attribute].keys():
                    for key, value in global_config.items():
                        if key not in configs[attribute]["metric"].keys():
                            configs[attribute]["metric"][key] = value
                if "sub_point" in configs[attribute].keys():
                    for key, value in global_config.items():
                        if key not in configs[attribute]["sub_point"].keys():
                            configs[attribute]["sub_point"][key] = value
        elif type(configs[attribute]) == list:
            for element in configs[attribute]:
                for key, value in global_config.items():
                    if key not in element.keys():
                        element[key] = value
        else:
            raise Exception("config attribute must be dict or list, depending on type")
    return configs
