import subprocess
import sys

"""
designer types
* point_label, cadence, course, elevation, gradient, heartrate, sub_point, imperial, metric, time, temperature, scene -> object
* labels -> list[dict]
* units -> list[str]
* hide -> boolean
* dpi, x, y, width, height, rotation, x_offset, y_offset, round, fps -> int
* line_width, point_weight, margin, opacity, fill_opacity, font_size -> float
* color -> string(hex or ______)
* suffix, output_filename, text -> str
* quicktime_compatible -> true


notes:
* i think speed should be a list of dict (simlar to labels) rather than including hide and opacity at top level
* we need to define a spec for minimum requirements for a template -> use this to generate a new template
* use the above types to write some sort of template validator -> similar to validating form inputs on payment web views
  * and use the types and validator to design template form behaviro -> encourage users to populate fields where required
    but also give option to extend template for additinoal customizability
* i know that flask supports forms - i think we should be able to leverage that -

"""

import subprocess
import sys

from activity import Activity
from scene import Scene
from template import build_configs


def demo_frame(gpx_filename, template_filename, second, headless):
    # bring the loop in here
    # open a browser window,
    # asked to specify which template and gpx file to consider
    # also asked to specify what time to render demo frame for
    # present form that allows user to edit template in real time using a form on left side of screen
    # listeners on inputs to re-render frame as template is updated
    # right side of browser shows updated frame
    # should be accessed simply using ./demo or a similary simple command

    spec = {"start", "end"}

    activity = Activity(gpx_filename)
    template = build_configs(template_filename)

    scene = Scene(activity, template)
    # TODO start/end should be optional
    if "start" in spec:
        start = scene.template["scene"]["start"]
    else:
        pass
    if "end" in spec:
        end = scene.template["scene"]["end"]
    else:
        pass
    activity.trim(start, end)
    activity.interpolate(scene.fps)
    if "plots" in spec:
        # TODO maybe a for plot in plots
        scene.build_figures()
    scene.render_demo(end - start, second)
    if not headless:
        subprocess.call(["open", scene.frames[0].full_path()])
    return scene


if __name__ == "__main__":
    test()
    exit()
    gpx_filename = "pinosaltos.gpx"
    template_filename = "safa_brian_a_4k.json"
    # template_filename = "safa_brian_a_1280_720.json"
    second = (
        int(sys.argv[1]) if len(sys.argv) == 2 else 0
    )  # probably move this to the gui
    while True:
        print(
            f"rendering demo frame using the {template_filename} template and {gpx_filename} gpx file"
        )
        scene = demo_frame(gpx_filename, template_filename, second)
        input("enter to re-render:")
        scene.update_configs(template_filename)
