import math
import os
import shutil
import subprocess

import constant
from config import config_dicts
from frame import Frame
from plot import build_plot_assets


class Scene:
    def __init__(
        self,
        activity,
        valid_attributes,
        config_filename,
        path=f"{os.path.dirname(__file__)}/tmp",
    ):
        self.activity = activity
        self.attributes = valid_attributes
        self.configs = config_dicts(config_filename)
        self.path = path  # TODO use tmp dir/ tmp file instead of using folder
        self.fps = self.configs["scene"]["fps"]
        self.labels = self.configs["labels"]
        self.activity.interpolate(self.fps)
        self.make_asset_directory()
        self.config_scene()
        self.frames = []

    def render_video(self):
        self.build_frames()
        build_plot_assets(self)
        self.draw_frames()
        self.export_video()

    def render_demo(self):
        self.build_frame(0, 0)
        build_plot_assets(self)
        self.draw_frames()

    def draw_frames(self):
        for ii, frame in enumerate(self.frames):
            print(f"{ii + 1}/{len(self.frames)}")
            frame.draw(self.configs)

    def config_scene(self):
        self.seconds = len(
            self.activity.time
        )  # I am assuming all gpx files have time data
        self.seconds = 4  # TODO change after debugging
        num_frames = self.seconds * self.fps
        self.frame_digits = int(math.log10(num_frames - 2)) + 1

    def delete_asset_directory(self):
        if os.path.exists(self.path) and os.path.isdir(self.path):
            shutil.rmtree(self.path)

    def make_asset_directory(self):
        if os.path.exists(self.path):
            self.delete_asset_directory()
        os.makedirs(self.path)
        os.makedirs(self.path + "/course")
        os.makedirs(self.path + "/elevation")

    # warning: quicktime_compatible codec produces nearly x5 larger file
    def export_video(self):
        output_filename = self.configs["scene"]["output_filename"]
        quicktime_compatible = self.configs["scene"]["quicktime_compatible"]
        less_verbose = ["-loglevel", "warning"]
        framerate = ["-r", str(self.fps)]
        fmt = ["-f", "image2"]
        input_files = ["-i", f"{self.path}/%0{self.frame_digits}d.png"]
        codec = ["-c:v", "prores_ks"] if quicktime_compatible else ["-c:v", "png"]
        pixel_format = (
            ["-pix_fmt", "yuva444p10le"]
            if quicktime_compatible
            else ["-pix_fmt", "rgba"]
        )
        output = ["-y", output_filename]
        subprocess.call(
            ["ffmpeg"]
            + less_verbose
            + framerate
            + fmt
            + input_files
            + codec
            + pixel_format
            + output
        )
        # self.delete_asset_directory()
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
        frame = Frame(
            f"{str(second * self.fps + frame_number).zfill(self.frame_digits)}.png",
            self.path,
            self.configs["scene"]["width"],
            self.configs["scene"]["height"],
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
