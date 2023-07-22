from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

import constant


def build_plot_assets(scene):
    if constant.ATTR_COURSE in scene.attributes:
        build_course_assets(scene)
    if (
        # possible key error here
        constant.ATTR_ELEVATION in scene.attributes
        and scene.configs[constant.ATTR_ELEVATION]["profile"]
    ):
        build_elevation_profile_assets(scene)


def build_course_assets(scene):
    # TODO add multiprocessing here
    # scene.attributes.remove(constant.ATTR_COURSE)
    config = scene.configs["course"]
    # scene_config = scene.configs["scene"]
    plt.rcParams["lines.linewidth"] = config["line_width"]
    plt.figure(
        figsize=(config["width"] / config["dpi"], config["height"] / config["dpi"])
    )
    # plot connected line width plt.figure(figsize=(width, height))
    # TODO - configure line color
    plt.axis("off")
    plt.plot(
        [ele[1] for ele in scene.activity.course],
        [ele[0] for ele in scene.activity.course],
        color=config["color"],
    )
    ii = 0
    sub_point = None
    for frame in scene.frames:
        print(f"{ii + 1}/{len(scene.frames)}")
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
            sub_point = plt.scatter(
                x=[lon],
                y=[lat],
                color=config["sub_point"]["color"],
                s=config["sub_point"]["point_weight"],
                zorder=2,
                alpha=config["sub_point"]["opacity"],
                edgecolor="none",
            )
        # TODO - take course width/height into consideration
        plt.savefig(
            f"{scene.path}/course/{frame.filename}",
            pad_inches=0,
            bbox_inches="tight",
            transparent=True,
            dpi=config["dpi"],
        )
        scatter.remove()
        if sub_point:
            sub_point.remove()
            sub_point = None
    plt.close()


def build_elevation_profile_assets(scene):
    # TODO add multiprocessing here
    # TODO create pngs that represent profile of elevation over course
    # draw these pngs in the frame draw method:56
    config = scene.configs["elevation"]["profile"]
    # scene_config = scene.configs["scene"]
    # fig, ax = plt.subplots(facecolor='none')
    plt.rcParams["lines.linewidth"] = config["line_width"]
    plt.figure(
        figsize=(config["width"] / config["dpi"], config["height"] / config["dpi"])
    )
    plt.axis("off")
    x = [
        ii
        for ii in range(
            len(scene.activity.elevation) * len(scene.activity.elevation[0])
        )
    ]
    y = np.array(sum(scene.activity.elevation, []))
    plt.plot(x, y, color=config["color"])
    plt.fill_between(
        x,
        y,
        0,
        where=(y > 0),
        facecolor=config["color"],
        alpha=config["opacity"],
    )
    ii = 0
    sub_point = None
    point_text = None
    # TODO - probably make this into a helper
    for frame in scene.frames:
        print(f"{ii + 1}/{len(scene.frames)}")
        ii += 1
        scatter = plt.scatter(
            x=[ii],
            y=[frame.elevation],
            color=config["color"],
            s=config["point_weight"],
            zorder=3,
        )
        if "point_label" in config.keys():
            point_text = plt.text(
                ii + config["point_label"]["x_offset"],
                frame.elevation + config["point_label"]["y_offset"],
                config["point_label"]["text"],
                fontsize=config["point_label"]["font_size"],
                color=config["point_label"]["color"],
                font=Path(
                    f'{constant.FONTS_DIR}{config["point_label"]["font"]}'
                ),  # TODO - support system fonts? not sure how pyplot deals with this
            )

        if "sub_point" in config.keys():
            # handle hide in sub point
            sub_point = plt.scatter(
                x=[ii],
                y=[frame.elevation],
                color=config["sub_point"]["color"],
                s=config["sub_point"]["point_weight"],
                zorder=2,
                alpha=config["opacity"],
                edgecolor="none",
            )
        # TODO - take course width/height into consideration
        plt.savefig(
            f"{scene.path}/elevation/{frame.filename}",
            pad_inches=0,
            bbox_inches="tight",
            transparent=True,
            dpi=config["dpi"],
        )
        scatter.remove()
        if sub_point:
            sub_point.remove()
            sub_point = None
        if point_text:
            point_text.remove()
            point_text = None
    plt.close()
