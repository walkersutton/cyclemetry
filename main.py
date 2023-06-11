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
    # TODO improve malformed argument handling
    # TODO - support passing template path - probably need to refactor config
    # gpx_filename = sys.argv[1]
    # template_filename = sys.argv[2]
    gpx_filename = "test.gpx"
    template_filename = "safa_brian_a.json"

    render_overlay(gpx_filename, template_filename)
