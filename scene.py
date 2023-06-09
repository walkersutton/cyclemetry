import math
import os
import shutil
import subprocess

import matplotlib.pyplot as plt
from PIL import Image

import constant
from config import config_dicts
from frame import Frame


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
        self.activity.interpolate(self.fps)
        self.make_asset_directory()
        self.config_scene()
        self.build_frames()
        self.build_assets()
        self.draw_frames()

    def draw_frames(self):
        for ii, frame in enumerate(self.frames):
            print(f"{ii + 1}/{len(self.frames)}")
            frame.draw_attributes(self.configs)

    def config_scene(self):
        self.seconds = len(
            self.activity.time
        )  # I am assuming all gpx files have time data
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
        os.makedirs(self.path + "/course")
        os.makedirs(self.path + "/profile")

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

    def build_frames(self):
        frames = []
        for second in range(self.seconds):
            for ii in range(self.fps):
                frame = Frame(
                    f"{str(second * self.fps + ii).zfill(self.frame_digits)}.png",
                    self.path,
                    self.configs["scene"]["width"],
                    self.configs["scene"]["height"],
                )
                frame.attributes = self.attributes
                frame_data = self.frame_attribute_data(second, ii)
                for attribute in frame.attributes:
                    setattr(frame, attribute, frame_data[attribute])
                frame.attributes
                frames.append(frame)
        self.frames = frames

    def build_assets(self):
        if constant.ATTR_COURSE in self.attributes:
            self.build_course_assets()
        if (
            # possible key error here
            constant.ATTR_ELEVATION in self.attributes
            and self.configs[constant.ATTR_ELEVATION]["profile"]
        ):
            self.build_elevation_profile_assets()

    def build_course_assets(self):
        # TODO add multiprocessing here
        # self.attributes.remove(constant.ATTR_COURSE)
        config = self.configs["course"]
        scene = self.configs["scene"]
        plt.rcParams["lines.linewidth"] = config["line_width"]
        # plot connected line width plt.figure(figsize=(width, height))
        # TODO - configure line color
        plt.axis("off")
        plt.plot(
            [ele[1] for ele in self.activity.course],
            [ele[0] for ele in self.activity.course],
            color=config["color"],
        )
        ii = 0
        sub_scatter = None
        for frame in self.frames:
            print(f"{ii + 1}/{len(self.frames)}")
            ii += 1
            lat, lon = frame.course
            scatter = plt.scatter(
                x=[lon],
                y=[lat],
                color=config["color"],
                s=config["point_weight"],
                zorder=3,
            )
            if "sub_point" in config.keys():
                # handle hide in sub point
                sub_scatter = plt.scatter(
                    x=[lon],
                    y=[lat],
                    color=config["sub_point"]["color"],
                    s=config["sub_point"]["point_weight"],
                    zorder=2,
                    alpha=config["sub_point"]["opacity"],
                    edgecolor="none",
                )
            # TODO - take course width/height into consideration
            plt.savefig(f"{self.path}/course/{frame.filename}", transparent=True)
            scatter.remove()
            if sub_scatter:
                sub_scatter.remove()
                sub_scatter = None

    def build_elevation_profile_assets(self):
        # TODO add multiprocessing here
        # TODO create pngs that represent profile of elevation over course
        # draw these pngs in the frame draw method:56
        config = self.configs["elevation"]
        scene = self.configs["scene"]
        plt.rcParams["lines.linewidth"] = config["line_width"]
        plt.axis("off")
        plt.plot(
            [ii for ii in range(len(self.activity.elevation))],
            [ele for ele in self.activity.elevation],
            color=config["color"],
        )
        ii = 0
        sub_scatter = None
        # TODO - probably make this into a helper
        for frame in self.frames:
            print(f"{ii + 1}/{len(self.frames)}")
            ii += 1
            scatter = plt.scatter(
                x=[ii],
                y=[frame.elevation],
                color=config["color"],
                s=config["point_weight"],
                zorder=3,
            )
            if "sub_point" in config.keys():
                # handle hide in sub point
                sub_scatter = plt.scatter(
                    x=[ii],
                    y=[frame.elevation],
                    color=config["sub_point"]["color"],
                    s=config["sub_point"]["point_weight"],
                    zorder=2,
                    alpha=config["sub_point"]["opacity"],
                    edgecolor="none",
                )
            # TODO - take course width/height into consideration
            plt.savefig(f"{self.path}/profile/{frame.filename}", transparent=True)
            scatter.remove()
            if sub_scatter:
                sub_scatter.remove()
                sub_scatter = None
