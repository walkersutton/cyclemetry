import sys

import inquirer

import constant
from activity import Activity
from scene import Scene


def render_overlay(gpx_filename, template_filename):
    activity = Activity(gpx_filename)
    scene = Scene(activity, activity.valid_attributes, template_filename)
    scene.export_video()


if __name__ == "__main__":
    # TODO improve argument handling
    if len(sys.argv) == 2:
        template_filename = sys.argv[1]
    else:
        template_filename = "blank_template.json"

    gpx_filename = "config.gpx"
    print(f"using {template_filename}")
    render_overlay(gpx_filename, template_filename)
