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
    return [constant.ATTR_COURSE, constant.ATTR_ELEVATION]


def render_overlay(filename):
    gpx = Gpx(filename)
    attributes = poll_attributes(gpx.existing_attributes())
    if attributes:
        scene = Scene(gpx, attributes)
        scene.export_video()


if __name__ == "__main__":
    # TODO improve malformed argument handling
    # TODO - support passing template path
    filename = sys.argv[1]
    render_overlay(filename)
