import json
import subprocess
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

    attributes = list(test_data.keys())
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
        print(f"the current value of {prop} is {prop_value}")
        try:  # might need to type case depending on the property
            subprocess.call(
                ["osascript", "-e", 'tell application "Terminal" to activate']
            )
            value = input("what value would you like to set it to?\n")
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
    choices = configs[attribute][unit].keys() if unit else configs[attribute].keys()
    while not props:
        question = [
            inquirer.Checkbox(
                "properties",
                message="Select properties to modify",
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
    try:
        show_frame(config_filename)
        while True:
            configs = raw_configs(config_filename)
            subprocess.call(
                ["osascript", "-e", 'tell application "Terminal" to activate']
            )
            attribute = inquirer.list_input(
                "Select attribute to modify", choices=sorted(configs.keys())
            )
            props = query_props(attribute, configs)
            for prop in props:
                if prop in ("imperial", "metric"):
                    modify_unit_props(attribute, prop, configs, config_filename)
                else:
                    modify_prop(attribute, prop, configs, config_filename)
    except (KeyboardInterrupt, TypeError):
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
        "x1": 0,
        "y1": 100,
        "x2": 0,
        "y2": 100,
        "hide": default_hide,
        "line_width": 1,
        "point_weight": 1,
    }
    blank_global = {"text_color": "#ffffff", "font_size": 30, "font": "Evogria.otf"}
    blank_unit = {"x": 0, "y": 0, "hide": default_hide}
    blank_scene = {"fps": 30, "height": 480, "width": 720}
    blank_time = {"hours_offset": 0, "format": "%H:%M:%S"}
    config = {}
    for attribute in constant.ALL_ATTRIBUTES:
        config[attribute] = {"x": 0, "y": 0, "suffix": "", "hide": default_hide}
        match attribute:
            case constant.ATTR_ELEVATION | constant.ATTR_SPEED | constant.ATTR_TEMPERATURE:
                config[attribute]["imperial"] = blank_unit
                config[attribute]["metric"] = blank_unit
                if attribute == constant.ATTR_ELEVATION:
                    config[attribute]["profile"] = blank_asset
            case constant.ATTR_COURSE:
                config[attribute] = blank_asset
            case constant.ATTR_TIME:
                config[attribute].update(blank_time)
    config["elevation"]
    config["global"] = blank_global
    config["scene"] = blank_scene
    json.dump(config, open(f"templates/{filename}", "w"), indent=2)


if __name__ == "__main__":
    safa = "safa_brian_a.json"
    # blank_template(safa)
    modify_template(safa)
