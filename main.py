import subprocess
import sys

import inquirer

import constant
from activity import Activity
from scene import Scene


def render_overlay(gpx_filename, template_filename):
    activity = Activity(gpx_filename)
    scene = Scene(activity, activity.valid_attributes, template_filename)
    scene.render_video()


def demo_frame(gpx_filename, template_filename):
    activity = Activity(gpx_filename)
    scene = Scene(activity, activity.valid_attributes, template_filename)
    scene.render_demo()
    subprocess.call(["open", scene.frames[0].full_path()])


if __name__ == "__main__":
    # TODO improve argument handling
    # template_filename = sys.argv[1]
    gpx_filename = "config.gpx"
    if len(sys.argv) == 2:
        if sys.argv[1] == "demo":
            template_filename = "safa_brian_a.json"
            template_filename = "blank_template.json"
            print(
                f"demoing frame using the {template_filename} template and {gpx_filename} gpx file"
            )
            demo_frame(gpx_filename, template_filename)
            exit()
    template_filename = "blank_template.json"
    print(
        f"rendering overlay using the {template_filename} template and {gpx_filename} gpx file"
    )
    render_overlay(gpx_filename, template_filename)
