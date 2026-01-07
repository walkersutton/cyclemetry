import io
from pathlib import Path

import constant
import matplotlib as mpl

# CRITICAL: Set backend BEFORE importing pyplot to avoid PyInstaller hanging
mpl.use("agg")

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import logging


def get_dpi(config):
    return config["dpi"] if "dpi" in config.keys() else constant.DEFAULT_DPI


def get_line_width(config):
    # TODO make sure a value here works
    return (
        config["line"]["width"]
        if ("line" in config.keys() and "width" in config["line"].keys())
        else constant.DEFAULT_LINE_WIDTH
    )


def get_line_color(config):
    # TODO make sure a value here works
    return (
        config["line"]["color"]
        if ("line" in config.keys() and "color" in config["line"].keys())
        else (config["color"] if "color" in config.keys() else constant.DEFAULT_COLOR)
    )


def get_margin(config):
    # TODO make sure a value here works
    return config["margin"] if "margin" in config.keys() else constant.DEFAULT_MARGIN


def get_point_weight(point_config):
    # TODO make sure a value here works
    return (
        point_config["weight"]
        if "weight" in point_config.keys()
        else constant.DEFAULT_POINT_WEIGHT
    )


def get_point_edge_color(point_config):
    return (
        "none"
        if (
            "remove_edge_color" in point_config.keys()
            and point_config["remove_edge_color"]
        )
        else (
            point_config["edge_color"] if "edge_color" in point_config.keys() else None
        )
    )


def get_point_color(point_config):
    return (
        point_config["color"]
        if "color" in point_config.keys()
        else constant.DEFAULT_COLOR
    )


def get_opacity(config):
    # TODO i think we don't need this if the merge configs is recursive, but pretty sure it's only top level
    return config["opacity"] if "opacity" in config else constant.DEFAULT_OPACITY


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
        color=get_line_color(config),
    )

    if "margin" in config.keys():
        ax = plt.gca()
        ax.set_xmargin(config["margin"])
        ax.set_ymargin(config["margin"])
    if "axis" in config.keys():
        try:
            plt.axis(config["axis"])
        except ValueError as e:
            logging.error(f"Invalid axis value: {e}")
    if "fill" in config.keys():
        opacity = get_opacity(config["fill"])
        min_threshold = min(y) * 0.99
        y = np.array(y)
        plt.fill_between(
            x,
            y,
            min_threshold,
            where=(y > min_threshold),
            facecolor=config["color"],
            alpha=opacity,
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
    points = []
    if "points" in config.keys():
        plt.figure(
            fig.number
        )  # i'm not really sure what this does - TODO can we remove this?
        zorder = len(config["points"]) + 1
        for point_config in config["points"]:
            color = get_point_color(point_config)
            edge_color = get_point_edge_color(point_config)
            weight = get_point_weight(point_config)
            points.append(
                plt.scatter(
                    x=x,
                    y=y,
                    color=color,
                    s=weight,
                    zorder=zorder,
                    alpha=point_config.get("opacity", 1.0),  # Default to fully opaque
                    edgecolor=edge_color,
                )
            )
            zorder -= 1
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
                    f"{constant.FONTS_DIR}{config['point_label']['font']}"
                ),  # TODO - support system fonts? not sure how pyplot deals with this
            )
        )
    return fig, labels
