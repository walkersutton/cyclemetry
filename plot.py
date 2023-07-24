import io
from pathlib import Path

import matplotlib.axes as ax
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

from constant import FONTS_DIR
from utils import printc


def build_figure(config, x, y):
    fig = plt.figure()
    if "width" and "height" in config.keys():
        fig = plt.figure(
            figsize=(config["width"] / config["dpi"], config["height"] / config["dpi"])
        )
    plt.rcParams["lines.linewidth"] = config["line_width"]
    plt.axis("off")
    plt.plot(
        x,
        y,
        color=config["color"],
    )

    if "margin" in config.keys():
        ax = plt.gca()
        ax.set_xmargin(config["margin"])
        ax.set_ymargin(config["margin"])
    if "axis" in config.keys():
        try:
            plt.axis(config["axis"])
        except ValueError as e:
            printc(f"Invalid axis value: {e}", "red")
    if "fill_opacity" in config.keys():
        y = np.array(y)
        plt.fill_between(
            x,
            y,
            0,
            where=(y > 0),
            facecolor=config["color"],
            alpha=config["fill_opacity"],
        )
    return fig


def build_image(fig, config, x, y, text=""):
    plt.figure(fig.number)
    fig, points = draw_points(fig, config, x, y)
    fig, labels = draw_labels(fig, config, x, y, text)

    # for some reason, faster to create buffer here than to pass as param - also prevents figure duplication issue
    buffer = io.BytesIO()
    plt.savefig(
        buffer,
        bbox_inches=config["bbox"] if "bbox" in config.keys() else None,
        transparent=True,
        dpi=config["dpi"],
    )
    img = Image.open(buffer)

    # TODO this is significantly faster than the above - need to get alpha channel working
    # fig.canvas.draw()
    # buffer = fig.canvas.tostring_argb()
    # img = Image.frombytes('RGBA', fig.canvas.get_width_height(), buffer)

    for point in points:
        point.remove()
    for label in labels:
        label.remove()
    return img, buffer


def draw_points(fig, config, x, y):
    plt.figure(fig.number)
    points = []
    points.append(
        plt.scatter(  # assuming every profile and course includes point_weight - might want to make this a child property
            x=x,
            y=y,
            color=config["color"],
            s=config["point_weight"],
            zorder=3,
        )
    )
    if "sub_point" in config.keys():
        points.append(
            plt.scatter(
                x=x,
                y=y,
                color=config["sub_point"]["color"],
                s=config["sub_point"]["point_weight"],
                zorder=2,
                alpha=config["sub_point"]["opacity"],
                edgecolor="none",
            )
        )
    return fig, points


def draw_labels(
    fig, config, x, y, text
):  # probably want to make text a list? and iterate through labels?
    plt.figure(fig.number)
    labels = []
    if "point_label" in config.keys():  # rename - label
        labels.append(
            plt.text(
                x + config["point_label"]["x_offset"],
                y + config["point_label"]["y_offset"],
                text,
                fontsize=config["point_label"]["font_size"],
                color=config["point_label"]["color"],
                font=Path(
                    f'{FONTS_DIR}{config["point_label"]["font"]}'
                ),  # TODO - support system fonts? not sure how pyplot deals with this
            )
        )
    return fig, labels
