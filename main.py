import sys

import inquirer

import constant
from gpx import Gpx
from scene import Scene


def render_overlay(gpx_filename, template_filename):
    gpx = Gpx(gpx_filename)
    scene = Scene(gpx, gpx.valid_attributes, template_filename)
    scene.export_video()


if __name__ == "__main__":
    # TODO improve argument handling
    if len(sys.argv) == 2:
        template_filename = sys.argv[1]
    else:
        template_filename = "test_template.json"

    gpx_filename = "test.gpx"
    print(f"using {template_filename}")
    render_overlay(gpx_filename, template_filename)
