import subprocess
import sys

import constant
from activity import Activity
from scene import Scene


def render_overlay(gpx_filename, template_filename):
    activity = Activity(gpx_filename)
    scene = Scene(activity, activity.valid_attributes, template_filename)
    start, end = scene.configs["scene"]["start"], scene.configs["scene"]["end"]
    activity.trim(start, end)
    activity.interpolate(scene.fps)
    scene.build_figures()
    scene.render_video(end - start)

# TODO improve argument handling
if __name__ == "__main__":
    gpx_filename = "config.gpx"
    template_filename = "safa_brian_a.json"
    # template_filename = "safa_brian_a_1280_720.json"
    print(
        f"rendering overlay using the {template_filename} template and {gpx_filename} gpx file"
    )
    render_overlay(gpx_filename, template_filename)
