import json
import os
import subprocess
import sys
from datetime import datetime

import inquirer
from PIL import Image, ImageDraw, ImageFont

import constant
import scene
from frame import Frame


def raw_configs(filename):
    with open(f"templates/{filename}", "r") as file:
        configs = json.load(file)
    return configs


def color_conversion():
    # maybe make this a helper
    # TODO probably will need this in config_dicts
    for key, value in attrib_config.items():
        if key == "text_color" and type(value) == list:
            attrib_config[key] = tuple(value)
        elif key == "text_color" and type(value) == str:
            attrib_config[key] = tuple(
                int(value.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4)
            )


def config_dicts(filename):
    configs = raw_configs(filename)
    global_config = configs["global"]
    for attribute in configs.keys():
        for key, value in global_config.items():
            if key not in configs[attribute].keys():
                configs[attribute][key] = value
        if any(elem in configs[attribute].keys() for elem in {"imperial", "metric"}):
            if "imperial" in configs[attribute].keys():
                for key, value in global_config.items():
                    if key not in configs[attribute]["imperial"].keys():
                        configs[attribute]["imperial"][key] = value
            if "metric" in configs[attribute].keys():
                for key, value in global_config.items():
                    if key not in configs[attribute]["metric"].keys():
                        configs[attribute]["metric"][key] = value
    return configs


def build_demo_frame(configs):
    test_data = {}
    for attribute in constant.ALL_ATTRIBUTES:
        test_data[attribute] = 50
    del test_data[constant.ATTR_COURSE]
    test_data[constant.ATTR_TIME] = datetime.now()

    demo_frame_filename = "demo_frame.png"
    frame = Frame(
        demo_frame_filename, "./", configs["scene"]["width"], configs["scene"]["height"]
    )
    frame.attributes = list(test_data.keys())

    for attribute, value in test_data.items():
        setattr(frame, attribute, value)

    frame.draw_attributes(configs)
    # scene = Scene(configs)
    # frame.draw_course_outline(configs[constant.ATTR_COURSE])
    # TODO - use scene here
    # maybe just make it easier and just draw the course without a scene? let's just get something out the door before making it pretty
    return frame.filename


def modify_prop(attribute, prop, configs, config_filename, unit=None):
    while True:
        if prop == "add a property":
            prop = input("Enter a new property:\n")
            if not prop:
                break
            if unit:
                configs[attribute][unit][prop] = None
            else:
                configs[attribute][prop] = None

        print(f"Modifying {prop} for {unit} {attribute}") if unit else print(
            f"Modifying {prop} for {attribute}"
        )
        prop_value = (
            configs[attribute][unit][prop] if unit else configs[attribute][prop]
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
            }:
                value = int(value)
            if unit:
                configs[attribute][unit][prop] = value
            else:
                configs[attribute][prop] = value
        except Exception as e:
            print("configging error during modify_prop", e)
        with open(f"templates/{config_filename}", "w") as file:
            json.dump(configs, file, indent=2)
        show_frame(config_filename)


def query_props(attribute, configs, unit=None):
    props = None
    if unit:
        message = f"Select properties to modify for {unit} {attribute}"
        choices = configs[attribute][unit].keys()
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


def modify_unit_props(attribute, unit, configs, config_filename):
    props = query_props(attribute, configs, unit)
    for prop in props:
        modify_prop(attribute, prop, configs, config_filename, unit)


def show_frame(config_filename):
    configs = config_dicts(config_filename)
    demo_frame_filename = build_demo_frame(configs)
    subprocess.call(["open", demo_frame_filename])
    return demo_frame_filename


def modify_template(config_filename):
    exit_choice = "*** exit ***"
    try:
        demo_frame_filename = show_frame(config_filename)
        while True:
            configs = raw_configs(config_filename)
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
                if prop in ("imperial", "metric"):
                    modify_unit_props(attribute, prop, configs, config_filename)
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
        try:
            os.remove(demo_frame_filename)
        except FileNotFoundError:
            print(f"File {demo_Frame_filename} not found.")
        except PermissionError:
            print(f"Permission denied to delete {demo_frame_filename}.")
        except Exception as e:
            print(f"An error occurred while deleting {demo_frame_filename}: {str(e)}")


def blank_template(filename="blank_template.json"):
    default_hide = False
    blank_asset = {
        "x1": 500,
        "y1": 10,
        "x2": 700,
        "y2": 200,
        "hide": default_hide,
        "line_width": 1,
        "point_weight": 1,
    }
    blank_global = {
        "font_size": 30,
        "font": "Evogria.otf",
        "color": "#ffffff",
    }
    blank_unit = {"x": 0, "y": 0, "hide": default_hide}
    blank_scene = {
        "fps": 30,
        "height": 480,
        "width": 720,
        "quicktime_compatible": True,
        "output_filename": "out.mov",
    }
    blank_time = {"hours_offset": 0, "format": "%H:%M:%S"}
    config = {}
    y = 0
    for attribute in constant.ALL_ATTRIBUTES:
        config[attribute] = blank_unit.copy()
        match attribute:
            case constant.ATTR_ELEVATION | constant.ATTR_SPEED | constant.ATTR_TEMPERATURE:
                config[attribute]["imperial"] = blank_unit.copy()
                config[attribute]["imperial"]["y"] = y
                y += 30
                config[attribute]["imperial"]["suffix"] = constant.DEFAULT_SUFFIX_MAP[
                    attribute
                ]["imperial"]
                config[attribute]["metric"] = blank_unit.copy()
                config[attribute]["metric"]["y"] = y
                y += 30
                config[attribute]["metric"]["suffix"] = constant.DEFAULT_SUFFIX_MAP[
                    attribute
                ]["metric"]
                del config[attribute]["x"]
                del config[attribute]["y"]
                if attribute == constant.ATTR_ELEVATION:
                    config[attribute]["profile"] = blank_asset
            case constant.ATTR_CADENCE | constant.ATTR_GRADIENT | constant.ATTR_HEARTRATE | constant.ATTR_POWER:
                config[attribute]["suffix"] = constant.DEFAULT_SUFFIX_MAP[attribute]
            case constant.ATTR_COURSE:
                config[attribute] = blank_asset
            case constant.ATTR_TIME:
                config[attribute].update(blank_time)
        if "y" in config[attribute].keys():
            config[attribute]["y"] = y
            y += 30
    config["global"] = blank_global
    config["scene"] = blank_scene
    json.dump(config, open(f"templates/{filename}", "w"), indent=2)


if __name__ == "__main__":
    if len(sys.argv) == 2:
        template_filename = sys.argv[1]
    else:
        template_filename = "blank_template.json"
        blank_template(template_filename)

    modify_template(template_filename)
