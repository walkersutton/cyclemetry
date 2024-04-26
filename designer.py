import json
import os
import subprocess
import sys
from datetime import datetime

import inquirer

import constant

'''
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

'''



def raw_template(filename):
    with open(f"templates/{filename}", "r") as file:
        tempalte = json.load(file)
    return template


def template_dicts(filename):
    configs = raw_template(filename)
    global_config = configs["global"]
    for attribute in configs.keys():
        if type(configs[attribute]) == dict:
            for key, value in global_config.items():
                if key not in configs[attribute].keys():
                    configs[attribute][key] = value
            if any(
                elem in configs[attribute].keys()
                for elem in {"sub_point", "imperial", "metric"}
            ):
                if "imperial" in configs[attribute].keys():
                    for key, value in global_config.items():
                        if key not in configs[attribute]["imperial"].keys():
                            configs[attribute]["imperial"][key] = value
                if "metric" in configs[attribute].keys():
                    for key, value in global_config.items():
                        if key not in configs[attribute]["metric"].keys():
                            configs[attribute]["metric"][key] = value
                if "sub_point" in configs[attribute].keys():
                    for key, value in global_config.items():
                        if key not in configs[attribute]["sub_point"].keys():
                            configs[attribute]["sub_point"][key] = value
        elif type(configs[attribute]) == list:
            for element in configs[attribute]:
                for key, value in global_config.items():
                    if key not in element.keys():
                        element[key] = value
        else:
            raise Exception("config attribute must be dict or list, depending on type")
    return configs


def modify_prop(attribute, prop, configs, config_filename, parent=None):
    while True:
        if prop == "add a property":
            prop = input("Enter a new property:\n")
            if not prop:
                break
            if parent:
                configs[attribute][parent][prop] = None
            else:
                configs[attribute][prop] = None

        print(f"Modifying {prop} for {parent} {attribute}") if parent else print(
            f"Modifying {prop} for {attribute}"
        )
        prop_value = (
            configs[attribute][parent][prop] if parent else configs[attribute][prop]
        )
        print(f"Current value: {prop_value}")

        try:  # might need to type case depending on the property - i.e. booleans should not take text input - should be selection
            subprocess.call(
                ["osascript", "-e", 'tell application "Terminal" to activate']
            )
            value = input("Enter a new value:\n")
            print("")
            if not value:
                break
            if prop == "hide":
                value = bool(value)
            elif prop in {
                "x",
                "y",
                "x1",
                "x2",
                "y1",
                "y2",
                "width",
                "height",
                "font_size",
                "round",
                "point_weight",
                "line_width",
                "dpi",
                "rotation",
            }:
                value = int(value)
            elif prop in {"opacity"}:
                value = float(value)
                if not (0 <= value <= 1):
                    print("Try again: opacity must be between 0 and 1")

            if parent:
                configs[attribute][parent][prop] = value
            else:
                configs[attribute][prop] = value
        except Exception as e:
            print("configging error during modify_prop", e)
        with open(f"templates/{config_filename}", "w") as file:
            json.dump(configs, file, indent=2)


def query_props(attribute, configs, parent=None):
    props = None
    if parent:
        message = f"Select properties to modify for {parent} {attribute}"
        choices = configs[attribute][parent].keys()
    else:
        message = f"Select properties to modify for {attribute}"
        choices = configs[attribute].keys()
    while not props:
        question = [
            inquirer.Checkbox(
                "properties",
                message=message,
                choices=sorted(list(choices) + ["add a property"]),
            ),
        ]
        props = inquirer.prompt(question)["properties"]
    return props


def modify_child_props(attribute, parent, configs, config_filename):
    props = query_props(attribute, configs, parent)
    for prop in props:
        modify_prop(attribute, prop, configs, config_filename, parent)


def modify_template(config_filename):
    exit_choice = "*** exit ***"
    try:
        while True:
            configs = raw_template(config_filename)
            subprocess.call(
                ["osascript", "-e", 'tell application "Terminal" to activate']
            )
            attribute = inquirer.list_input(
                "Select attribute to modify",
                choices=[exit_choice] + sorted(configs.keys()),
            )
            if attribute == exit_choice:
                break
            props = query_props(attribute, configs)
            for prop in props:
                if prop in ("sub_point", "imperial", "metric"):
                    modify_child_props(attribute, prop, configs, config_filename)
                else:
                    modify_prop(attribute, prop, configs, config_filename)
    except (KeyboardInterrupt, TypeError) as e:
        print(e)
    finally:
        window_number = int(
            subprocess.check_output(
                ["osascript", "-e", 'tell application "Preview" to count window']
            )
            .decode("utf-8")
            .replace("\n", "")
        )
        if window_number > 0:
            subprocess.call(
                [
                    "osascript",
                    "-e",
                    f'tell application "Preview" to close window {str(window_number)}',
                ]
            )
        for f in [
            demo_frame_filename,
            "./tmp/course/demo_frame_00.png",
            "./tmp/profile/demo_frame_00.png",
        ]:
            try:
                os.remove(f)
            except FileNotFoundError:
                print(f"File {f} not found.")
            except PermissionError:
                print(f"Permission denied to delete {f}.")
            except Exception as e:
                print(f"An error occurred while deleting {f}: {str(e)}")


def blank_template(filename="blank_template.json"):
    default_hide = False
    blank_asset = {
        "dpi": 150,
        "x": 0,
        "y": 0,
        "hide": default_hide,
        "line_width": 2,
        "point_weight": 60,
        "sub_point": {  # maybe this should only be for course and not elevation profile
            "point_weight": 280,
            "opacity": 0.5,
        },
    }
    blank_global = {
        "font_size": 30,
        "font": "Evogria.otf",
        "color": "#ffffff",
    }

    blank_value = {"x": 0, "y": 0, "hide": default_hide}
    blank_label = {"text": "test label", "x": 0, "y": 0, "hide": default_hide}
    blank_scene = {
        "fps": 30,
        "height": 1080,
        "width": 1920,
        "quicktime_compatible": True,
        "output_filename": "out.mov",
    }
    blank_time = {"hours_offset": 0, "format": "%H:%M:%S"}
    config = {}
    y = 0
    for attribute in constant.ALL_ATTRIBUTES:
        config[attribute] = blank_value.copy()
        match attribute:
            case constant.ATTR_SPEED | constant.ATTR_TEMPERATURE:  # fix elevation properties
                config[attribute]["imperial"] = blank_value.copy()
                config[attribute]["imperial"]["y"] = y
                y += 30
                config[attribute]["imperial"]["suffix"] = constant.DEFAULT_SUFFIX_MAP[
                    attribute
                ]["imperial"]
                config[attribute]["metric"] = blank_value.copy()
                config[attribute]["metric"]["y"] = y
                y += 30
                config[attribute]["metric"]["suffix"] = constant.DEFAULT_SUFFIX_MAP[
                    attribute
                ]["metric"]
                del config[attribute]["x"]
                del config[attribute]["y"]
            case constant.ATTR_CADENCE | constant.ATTR_GRADIENT | constant.ATTR_HEARTRATE | constant.ATTR_POWER:
                config[attribute]["suffix"] = constant.DEFAULT_SUFFIX_MAP[attribute]
            case constant.ATTR_COURSE | constant.ATTR_ELEVATION:
                config[attribute] = blank_asset.copy()
                config[attribute]["rotation"] = 0
                if attribute == constant.ATTR_ELEVATION:
                    config[attribute]["profile"] = blank_asset.copy()
            case constant.ATTR_TIME:
                config[attribute].update(blank_time)
        if "y" in config[attribute].keys():
            config[attribute]["y"] = y
            y += 30
    config["global"] = blank_global
    config["scene"] = blank_scene
    config["labels"] = [blank_label.copy()]
    json.dump(config, open(f"templates/{filename}", "w"), indent=2)

import subprocess
import sys

import inquirer # i think we use this for CLI interactions

from activity import Activity
from scene import Scene

def demo_frame(gpx_filename, template_filename, second):
	# bring the loop in here
	# open a browser window,
	# asked to specify which template and gpx file to consider
	# also asked to specify what time to render demo frame for
	# present form that allows user to edit template in real time using a form on left side of screen
	# listeners on inputs to re-render frame as template is updated
	# right side of browser shows updated frame
	# should be accessed simply using ./demo or a similary simple command

    activity = Activity(gpx_filename)
    scene = Scene(activity, activity.valid_attributes, template_filename)
    start, end = scene.configs["scene"]["start"], scene.configs["scene"]["end"]
    activity.trim(start, end)
    activity.interpolate(scene.fps)
    scene.build_figures()
    scene.render_demo(end - start, second)
    subprocess.call(["open", scene.frames[0].full_path()])
    return scene


if __name__ == "__main__":
    gpx_filename = "config.gpx"
    template_filename = "safa_brian_a.json"
    # template_filename = "safa_brian_a_1280_720.json"
	second = int(sys.argv[1]) if len(sys.argv) == 2 else 0 # probably move this to the gui
	while True:
		print(
			f"rendering demo frame using the {template_filename} template and {gpx_filename} gpx file"
		)
		scene = demo_frame(gpx_filename, template_filename, second)
		input("enter to re-render:")
		scene.update_configs(template_filename)
