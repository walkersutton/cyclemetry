import math
import os
import shutil
import subprocess

import matplotlib.pyplot as plt
from moviepy.editor import *

import constant
from config import build_config
from frame import Frame


class Scene:
    def __init__(self, gpx, attributes, path=f"{os.path.dirname(__file__)}/tmp"):
        self.gpx = gpx
        self.attributes = attributes
        self.gpx.parse_data(self.attributes)
        self.path = path  # TODO use tmp dir/ tmp file instead of using folder
        self.fps = build_config("scene")["fps"]
        self.make_asset_directory()
        self.config_scene()
        self.build_frames()
        self.build_configs()
        self.build_assets()
        self.draw_frames()

        # now_string = ''.join(str(datetime.now()).split())
        # frame_dir = f'{os.path.dirname(__file__)}/{now_string}'

    def draw_frames(self):
        for ii, frame in enumerate(self.frames):
            print(f"{ii + 1}/{len(self.frames)}")
            frame.draw_attributes(self.attributes, self.configs)

    def build_configs(self):
        configs = {}
        for attribute in self.attributes:
            configs[attribute] = build_config(attribute)
        self.configs = configs

    def config_scene(self):
        self.seconds = len(
            self.gpx.course
        )  # probablly should make this time? i imagine all gpx has time attribute
        self.seconds = 2  # TODO change after debugging
        num_frames = self.seconds * self.fps
        self.frame_digits = int(math.log10(num_frames - 2)) + 1

    def delete_asset_directory(self):
        if os.path.exists(self.path) and os.path.isdir(self.path):
            shutil.rmtree(self.path)

    def make_asset_directory(self):
        if os.path.exists(self.path):
            self.delete_asset_directory()
        os.makedirs(self.path)

    # warning: quicktime_compatible codec produces nearly x5 larger file
    def export_video(self, output_file="out.mov", quicktime_compatible=True):
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
        output = ["-y", output_file]
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
        self.delete_asset_directory()
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

    def frame_attribute_data(self, second: int):
        attribute_data = {}
        for attribute in self.attributes:
            attribute_data[attribute] = getattr(self.gpx, attribute)[second]
        return attribute_data

    def build_frames(self):
        frames = []
        for second in range(self.seconds):
            frame_data = self.frame_attribute_data(second)
            for ii in range(self.fps):
                frame = Frame(
                    f"{self.path}/{str(second * self.fps + ii).zfill(self.frame_digits)}.png",
                )
                for attribute in self.attributes:
                    setattr(frame, attribute, frame_data[attribute])
                frames.append(frame)
        self.frames = frames

    def build_assets(self):
        if constant.ATTR_COURSE in self.attributes:
            self.build_course_assets()
        else:
            pass
            # self.build_blank_assets()
        if (
            constant.ATTR_ELEVATION in self.attributes
            and self.configs[constant.ATTR_ELEVATION]["profile"]
        ):
            self.build_elevation_profile_assets()

    def build_course_assets(self):
        # TODO add multiprocessing here
        self.attributes.remove(constant.ATTR_COURSE)
        course_config = build_config("course")
        plt.rcParams["lines.linewidth"] = course_config["line_width"]
        # plot connected line width plt.figure(figsize=(width, height))
        # todo - configure line color
        plt.axis("off")
        plt.plot(
            [ele[1] for ele in self.gpx.course], [ele[0] for ele in self.gpx.course]
        )
        ii = 0
        for frame in self.frames:
            print(f"{ii + 1}/{len(self.frames)}")
            ii += 1
            lat, lon = frame.course
            scatter = plt.scatter(
                x=[lon],
                y=[lat],
                color=course_config[
                    "primary_color"
                ],  # TODO - might need to do something about hex/tuple color conversions
                s=course_config["point_weight"],
            )
            plt.savefig(frame.filename, transparent=True)
            scatter.remove()

    def build_blank_assets(self):
        # TODO add multiprocessing here
        # build (fps * seconds) blank pngs
        pass

    def build_elevation_profile_assets(self):
        # TODO add multiprocessing here
        # TODO create pngs that represent profile of elevation over course
        # draw these pngs in the frame draw method:56
        pass
