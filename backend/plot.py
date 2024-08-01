import io
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib as mpl
import numpy as np
from PIL import Image

from constant import FONTS_DIR
from utils import printc

mpl.use("agg")

DEFAULT_DPI = 300
DEFAULT_LINE_WIDTH = 1.75
DEFAULT_MARGIN = 0.1
DEFAULT_POINT_WEIGHT = 80


def get_dpi(config):
    return config["dpi"] if "dpi" in config.keys() else DEFAULT_DPI


def get_line_width(config):
    # TODO make sure a value here works
    return (
        config["line"]["width"]
        if ("line" in config.keys() and "width" in config["line"].keys())
        else DEFAULT_LINE_WIDTH
    )


def get_margin(config):
    # TODO make sure a value here works
    return config["margin"] if "margin" in config.keys() else DEFAULT_MARGIN


def get_point_weight(config):
    # TODO make sure a value here works
    return (
        config["point_weight"]
        if "point_weight" in config.keys()
        else DEFAULT_POINT_WEIGHT
    )


def build_figure(config, x, y):
    dpi = get_dpi(config)
    line_width = get_line_width(config)

    fig = plt.figure()
    if "width" and "height" in config.keys():
        padding = 200
        fig = plt.figure(
            figsize=(
                (config["width"] + padding) / dpi,
                (config["height"] + padding) / dpi,
            )
        )
    plt.rcParams["lines.linewidth"] = line_width
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
        min_threshold = min(y) * 0.99
        y = np.array(y)
        plt.fill_between(
            x,
            y,
            min_threshold,
            where=(y > min_threshold),
            facecolor=config["color"],
            alpha=config["fill_opacity"],
        )
    return fig


def build_image(fig, config, x, y, text=""):
    dpi = get_dpi(config)
    plt.figure(fig.number)
    fig, points = draw_points(fig, config, x, y)
    fig, labels = draw_labels(fig, config, x, y, text)

    # for some reason, faster to create buffer here than to pass as param - also prevents figure duplication issue
    buffer = io.BytesIO()
    plt.savefig(
        buffer,
        bbox_inches=config["bbox"] if "bbox" in config.keys() else None,
        transparent=True,
        dpi=dpi,
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
    point_weight = get_point_weight(config)

    plt.figure(fig.number)
    points = []
    points.append(
        plt.scatter(  # assuming every profile and course includes point_weight - might want to make this a child property
            x=x,
            y=y,
            color=config["color"],
            s=point_weight,
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
