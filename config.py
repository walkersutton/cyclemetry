import json
import subprocess
import sys
from datetime import datetime

import inquirer
from PIL import Image, ImageDraw, ImageFont

import constant
import scene
from frame import Frame

CONFIG_FRAME_FILENAME = "tmp.png"


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


def demo_image(configs):
    test_data = {}
    for attribute in constant.ALL_ATTRIBUTES:
        test_data[attribute] = 50
    del test_data[constant.ATTR_COURSE]
    test_data[constant.ATTR_TIME] = datetime.now()

    frame = Frame(CONFIG_FRAME_FILENAME)
    frame.attributes = list(test_data.keys())

    for attribute, value in test_data.items():
        setattr(frame, attribute, value)
    img = Image.new("RGBA", (configs["scene"]["width"], configs["scene"]["height"]))
    img.save(frame.filename)
    frame.draw_attributes(configs)
    frame.draw_course_outline(configs[constant.ATTR_COURSE])
    return frame.filename


def modify_prop(attribute, prop, configs, config_filename, unit=None):
    while True:
        prop_value = (
            configs[attribute][unit][prop] if unit else configs[attribute][prop]
        )
        print(f"Modifying {prop} for {unit} {attribute}") if unit else print(
            f"Modifying {prop} for {attribute}"
        )
        print(f"Current value: {prop_value}")
        try:  # might need to type case depending on the property
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
    demo_image(configs)
    subprocess.call(["open", CONFIG_FRAME_FILENAME])


def modify_template(config_filename):
    exit_choice = "*** exit ***"
    try:
        show_frame(config_filename)
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
    except (KeyboardInterrupt, TypeError):
        pass
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


def blank_template(filename="blank_template.json"):
    default_hide = False
    blank_asset = {
        "x1": 10,
        "y1": 10,
        "x2": 200,
        "y2": 200,
        "hide": default_hide,
        "line_width": 1,
        "point_weight": 1,
    }
    blank_global = {
        "text_color": "#ffffff",
        "font_size": 30,
        "font": "Evogria.otf",
        "color": "#ffffff",
    }
    blank_unit = {"x": 0, "y": 0, "hide": default_hide}
    blank_scene = {"fps": 30, "height": 480, "width": 720}
    blank_time = {"hours_offset": 0, "format": "%H:%M:%S"}
    config = {}
    for attribute in constant.ALL_ATTRIBUTES:
        config[attribute] = blank_unit.copy()
        match attribute:
            case constant.ATTR_ELEVATION | constant.ATTR_SPEED | constant.ATTR_TEMPERATURE:
                config[attribute]["imperial"] = blank_unit.copy()
                config[attribute]["imperial"]["suffix"] = constant.DEFAULT_SUFFIX_MAP[
                    attribute
                ]["imperial"]
                config[attribute]["metric"] = blank_unit.copy()
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
    config["global"] = blank_global
    config["scene"] = blank_scene
    json.dump(config, open(f"templates/{filename}", "w"), indent=2)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        template_filename = sys.argv[1]
    else:
        template_filename = "blank_template.json"
        blank_template(template_filename)
    modify_template(template_filename)
