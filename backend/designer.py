import logging
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
* i think speed should be a list of dict (similar to labels) rather than including hide and opacity at top level
* use the above types to write some sort of template validator -> similar to validating form inputs on payment web views
  * and use the types and validator to design template form behavior -> encourage users to populate fields where required
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
    # should be accessed simply using ./demo or a similarly simple command

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


def demo_frame_v2(gpx_filename, config, second):
    # Validate inputs
    if not gpx_filename:
        error_msg = "No GPX filename provided"
        logging.error(f"demo_frame_v2: {error_msg}")
        return {"error": error_msg, "error_code": "MISSING_GPX"}

    if not config or not isinstance(config, dict):
        error_msg = "Invalid config - must be a valid template object"
        logging.error(f"demo_frame_v2: {error_msg}")
        return {"error": error_msg, "error_code": "INVALID_CONFIG"}

    if not isinstance(second, (int, float)):
        logging.error(
            f"demo_frame_v2: Invalid second value: {second} (type: {type(second)})"
        )
        try:
            second = int(second)
        except (ValueError, TypeError):
            error_msg = f"Invalid second value: {second}"
            logging.error("demo_frame_v2: Could not convert second to int")
            return {"error": error_msg, "error_code": "INVALID_SECOND"}

    try:
        configs = build_configs_v2(config)
        activity = Activity(gpx_filename)
    except FileNotFoundError as e:
        error_msg = f"GPX file not found: {gpx_filename}"
        logging.error(f"demo_frame_v2: {error_msg}")
        logging.error(str(e))
        return {"error": error_msg, "error_code": "GPX_NOT_FOUND"}
    except Exception as e:
        error_msg = f"Failed to initialize: {str(e)}"
        logging.error("demo_frame_v2: Setup failed")
        logging.error(str(e))
        import traceback

        traceback.print_exc()
        return {"error": error_msg, "error_code": "SETUP_ERROR"}

    if not hasattr(activity, "gpx"):
        error_msg = "Invalid GPX file - missing required data"
        logging.error(f"demo_frame_v2: {error_msg}")
        return {"error": error_msg, "error_code": "INVALID_GPX"}

    logging.info("Activity loaded successfully")

    try:
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
    except Exception as e:
        logging.error("demo_frame_v2")
        logging.error("fucked setting start and end")
        logging.error(e)

    scene = None
    try:
        # Validate fps
        fps = configs["scene"].get("fps", 30)
        if not isinstance(fps, (int, float)) or fps <= 0:
            logging.error(f"Invalid fps: {fps}, using default 30")
            fps = 30
            configs["scene"]["fps"] = fps

        activity.trim(start, end)
        activity.interpolate(fps)
        scene = Scene(activity, configs)
    except Exception as e:
        error_msg = f"Failed to build scene: {str(e)}"
        logging.error("demo_frame_v2: Scene building failed")
        logging.error(str(e))
        import traceback

        traceback.print_exc()
        return {"error": error_msg, "error_code": "SCENE_BUILD_ERROR"}

    try:
        scene.build_figures()
        # Convert absolute second to relative second (after trim)
        duration = end - start
        if duration <= 0:
            error_msg = f"Invalid duration: start={start}, end={end}. End must be greater than start."
            logging.error(f"demo_frame_v2: {error_msg}")
            return {"error": error_msg, "error_code": "INVALID_DURATION"}

        relative_second = max(0, min(second - start, duration - 1))
        logging.info(
            f"Rendering demo at second {second} (relative: {relative_second}, range: 0-{duration}, start={start}, end={end})"
        )

        if relative_second < 0 or relative_second >= duration:
            error_msg = f"Selected second {second} is outside the activity range ({start}-{end})"
            logging.error(f"demo_frame_v2: {error_msg}")
            return {"error": error_msg, "error_code": "SECOND_OUT_OF_RANGE"}

        scene.render_demo(duration, relative_second)
    except KeyError as e:
        error_msg = f"Template configuration error: Missing required field '{str(e)}'"
        logging.error(f"demo_frame_v2: KeyError in template - {str(e)}")
        import traceback

        traceback.print_exc()
        return {"error": error_msg, "error_code": "TEMPLATE_ERROR"}
    except Exception as e:
        error_msg = f"Failed to render: {str(e)}"
        logging.error("demo_frame_v2: Rendering failed")
        logging.error(str(e))
        import traceback

        traceback.print_exc()
        return {"error": error_msg, "error_code": "RENDER_ERROR"}

    return scene
