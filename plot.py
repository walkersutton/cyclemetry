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
    course_config = scene.configs["course"]
    # scene_config = scene.configs["scene"]
    plt.rcParams["lines.linewidth"] = course_config["line_width"]
    # plot connected line width plt.figure(figsize=(width, height))
    # TODO - configure line color
    plt.axis("off")
    plt.plot(
        [ele[1] for ele in scene.activity.course],
        [ele[0] for ele in scene.activity.course],
        color=course_config["color"],
    )
    ii = 0
    sub_scatter = None
    for frame in scene.frames:
        print(f"{ii + 1}/{len(scene.frames)}")
        ii += 1
        lat, lon = frame.course
        scatter = plt.scatter(
            x=[lon],
            y=[lat],
            color=course_config["color"],
            s=course_config["point_weight"],
            zorder=3,
        )
        if "sub_point" in course_config.keys():
            # handle hide in sub point
            sub_scatter = plt.scatter(
                x=[lon],
                y=[lat],
                color=course_config["sub_point"]["color"],
                s=course_config["sub_point"]["point_weight"],
                zorder=2,
                alpha=course_config["sub_point"]["opacity"],
                edgecolor="none",
            )
        # TODO - take course width/height into consideration
        plt.savefig(f"{scene.path}/course/{frame.filename}", transparent=True)
        scatter.remove()
        if sub_scatter:
            sub_scatter.remove()
            sub_scatter = None


def build_elevation_profile_assets(scene):
    # TODO add multiprocessing here
    # TODO create pngs that represent profile of elevation over course
    # draw these pngs in the frame draw method:56
    elevation_config = scene.configs["elevation"]
    # scene_config = scene.configs["scene"]
    # fig, ax = plt.subplots(facecolor='none')
    plt.rcParams["lines.linewidth"] = elevation_config["line_width"]
    plt.axis("off")
    x = [
        ii
        for ii in range(
            len(scene.activity.elevation) * len(scene.activity.elevation[0])
        )
    ]
    y = np.array(sum(scene.activity.elevation, []))
    plt.plot(x, y, color=elevation_config["color"])
    plt.fill_between(
        x,
        y,
        0,
        where=(y > 0),
        facecolor=elevation_config["color"],
        alpha=elevation_config["sub_point"]["opacity"],
    )
    ii = 0
    sub_scatter = None
    point_text = None
    # TODO - probably make this into a helper
    for frame in scene.frames:
        print(f"{ii + 1}/{len(scene.frames)}")
        ii += 1
        scatter = plt.scatter(
            x=[ii],
            y=[frame.elevation],
            color=elevation_config["color"],
            s=elevation_config["point_weight"],
            zorder=3,
        )
        if "point_label" in elevation_config.keys():
            point_text = plt.text(
                ii + elevation_config["point_label"]["x_offset"],
                frame.elevation + elevation_config["point_label"]["y_offset"],
                elevation_config["point_label"]["text"],
                fontsize=elevation_config["point_label"]["font_size"],
                color=elevation_config["point_label"]["color"],
                font=Path(f'./fonts/{elevation_config["point_label"]["font"]}'),
            )

        if "sub_point" in elevation_config.keys():
            # handle hide in sub point
            sub_scatter = plt.scatter(
                x=[ii],
                y=[frame.elevation],
                color=elevation_config["sub_point"]["color"],
                s=elevation_config["sub_point"]["point_weight"],
                zorder=2,
                alpha=elevation_config["sub_point"]["opacity"],
                edgecolor="none",
            )
        # TODO - take course width/height into consideration
        plt.tight_layout()
        plt.savefig(
            f"{scene.path}/profile/{frame.filename}",
            bbox_inches="tight",
            transparent=True,
        )
        scatter.remove()
        if sub_scatter:
            sub_scatter.remove()
            sub_scatter = None
        if point_text:
            point_text.remove()
            point_text = None
