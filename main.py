import sys

import inquirer

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
    return ["course"]


def render_overlay(filename):
    gpx = Gpx(filename)
    attributes = poll_attributes(gpx.existing_attributes())
    if attributes:
        scene = Scene(gpx, attributes)
        # scene.draw_attributes() TODO
        scene.export_video()


if __name__ == "__main__":
    # TODO improve malformed argument handling
    try:
        filename = sys.argv[1]
        # TODO - support passing template path
        render_overlay(filename)
    except Exception as e:
        print("command line arguments are malformed:", e)
