import subprocess
import sys

import constant
from activity import Activity
from scene import Scene
import argparse
from designer import demo_frame
from template import build_configs


def render_overlay(gpx_filename, template_filename):
    activity = Activity(gpx_filename)
    template = build_configs(template_filename)
    scene = Scene(activity, template)
    start, end = template["scene"]["start"], template["scene"]["end"]
    activity.trim(start, end)
    activity.interpolate(scene.fps)
    scene.build_figures()
    scene.render_video(end - start)


if __name__ == "__main__":
    # gpx_filename = "vpcrit.gpx"
    # template_filename = "safa_brian_a.json"
    # template_filename = "safa_brian_a_1280_720.json"
    # gpx_filename = "pinosaltos.gpx"
    # template_filename = "safa_brian_a_4k.json"
    # template_filename = "safa_brian_a_1280_720.json"

    parser = argparse.ArgumentParser(description="TODO argparse description.")
    subparsers = parser.add_subparsers(dest="command")

    # Create a subparser for the 'demo' command
    parser_demo = subparsers.add_parser("demo", help="Run demo with specified config")
    parser_demo.add_argument("-template", required=True, help="template filename")
    parser_demo.add_argument("-gpx", required=True, help="gpx filename")
    parser_demo.add_argument(
        "-second",
        required=True,
        help="second to render demo frame",
        default=0,
        type=int,
    )

    # Create a subparser for the 'render' command
    parser_render = subparsers.add_parser("render", help="Render with specified config")
    parser_render.add_argument("-template", required=True, help="template filename")
    parser_render.add_argument("-gpx", required=True, help="gpx filename")

    args = parser.parse_args()

    if args.command == "demo":
        while True:
            print(
                f"rendering demo frame using the {args.template} template and {args.gpx} gpx file"
            )
            scene = demo_frame(args.gpx, args.template, args.second, False)
            input("enter to re-render:")
            scene.update_configs(args.template)
    elif args.command == "render":
        print(
            f"rendering overlay using the {args.template} template and {args.gpx} gpx file"
        )
        render_overlay(args.gpx, args.template)
    else:
        parser.print_help()
