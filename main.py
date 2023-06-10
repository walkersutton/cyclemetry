import sys

import inquirer

import constant
from gpx import Gpx
from scene import Scene


def poll_attributes(valid_attributes):
    # questions = [
    #     inquirer.Checkbox(
    #         "attributes",
    #         message="Select data to include:",
    #         choices=sorted(valid_attributes),
    #     ),
    # ]
    # answers = inquirer.prompt(questions)
    # return answers["attributes"]
    return [
        constant.ATTR_CADENCE,
        constant.ATTR_COURSE,
        constant.ATTR_ELEVATION,
        constant.ATTR_HEARTRATE,
        constant.ATTR_POWER,
        constant.ATTR_TEMPERATURE,
    ]


def render_overlay(filename):
    gpx = Gpx(filename)
    attributes = poll_attributes(gpx.attributes)
    if attributes:
        scene = Scene(gpx, attributes)
        scene.export_video()


if __name__ == "__main__":
    # TODO improve malformed argument handling
    # TODO - support passing template path - probably need to refactor config
    filename = sys.argv[1]
    render_overlay(filename)
