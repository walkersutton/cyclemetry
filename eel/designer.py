import subprocess

from activity import Activity
from scene import Scene
from template import build_configs, build_configs_v2

"""
designer types
* point_label, cadence, course, elevation, gradient, heartrate, sub_point, imperial, metric, time, temperature, scene -> object
* labels -> list[dict]
* units -> list[str]
* hide -> boolean
* dpi, x, y, width, height, rotation, x_offset, y_offset, round, fps -> int
* line_width, point_weight, margin, opacity, fill_opacity, font_size -> float
* color -> string(hex or ______)
* suffix, overlay_filename, text -> str

notes:
* i think speed should be a list of dict (simlar to labels) rather than including hide and opacity at top level
* use the above types to write some sort of template validator -> similar to validating form inputs on payment web views
  * and use the types and validator to design template form behaviro -> encourage users to populate fields where required
    but also give option to extend template for additinoal customizability
* i know that flask supports forms - i think we should be able to leverage that -

"""


def demo_frame(gpx_filename, template_filename, second, headless):
    # bring the loop in here
    # open a browser window,
    # asked to specify which template and gpx file to consider
    # also asked to specify what time to render demo frame for
    # present form that allows user to edit template in real time using a form on left side of screen
    # listeners on inputs to re-render frame as template is updated
    # right side of browser shows updated frame
    # should be accessed simply using ./demo or a similary simple command

    configs = build_configs(template_filename)
    activity = Activity(gpx_filename)

    start = configs["scene"]["start"] if "start" in configs["scene"] else 0

    if "end" in configs["scene"]:
        end = configs["scene"]["end"]
    else:
        attributes = activity.valid_attributes
        if attributes:
            end = len(getattr(activity, attributes[0]))
        else:
            print("wtf")
            end = 69

    activity.trim(start, end)
    activity.interpolate(configs["scene"]["fps"])
    scene = Scene(activity, configs)

    scene.build_figures()
    scene.render_demo(end - start, second)
    if not headless:
        subprocess.call(["open", scene.frames[0].full_path()])
    return scene

def demo_frame_v2(gpx_filename, config, second, headless):
    configs = build_configs_v2(config)
    activity = Activity(gpx_filename)

    start = configs["scene"]["start"] if "start" in configs["scene"] else 0

    if "end" in configs["scene"]:
        end = configs["scene"]["end"]
    else:
        attributes = activity.valid_attributes
        if attributes:
            end = len(getattr(activity, attributes[0]))
        else:
            print("wtf")
            end = 69

    activity.trim(start, end)
    activity.interpolate(configs["scene"]["fps"])
    scene = Scene(activity, configs)

    scene.build_figures()
    scene.render_demo(end - start, second)
    if not headless:
        subprocess.call(["open", scene.frames[0].full_path()])
    return scene
