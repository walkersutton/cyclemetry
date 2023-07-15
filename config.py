import json
import os
import subprocess
import sys
from datetime import datetime

import inquirer
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont

import constant
import scene
from activity import elevation_from_gpx, lat_lon_from_gpx
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


# TODO god this is ugly - refactor pleaseeeee
def build_demo_course(config, frame):
    plt.rcParams["lines.linewidth"] = config["line_width"]
    # plot connected line width plt.figure(figsize=(width, height))
    # TODO - configure line color
    plt.axis("off")
    test_gpx_filename = "config.gpx"
    if os.path.exists(test_gpx_filename):
        lat, lon = lat_lon_from_gpx(test_gpx_filename)
    else:
        lat = [ii for ii in range(100)]
        lon = [ii for ii in range(100)]
    plt.plot(
        lon,
        lat,
        color=config["color"],
    )
    plt.scatter(
        x=[lon[0]],
        y=[lat[0]],
        color=config[
            "color"
        ],  # TODO - might need to do something about hex/tuple color conversions
        s=config["sub_point"]["point_weight"],
        alpha=config["sub_point"]["opacity"],
        edgecolor="none",
        zorder=2,
    )
    plt.scatter(
        x=[lon[0]],
        y=[lat[0]],
        color=config[
            "color"
        ],  # TODO - might need to do something about hex/tuple color conversions
        s=config["point_weight"],
        zorder=3,
    )
    course_path = f"{frame.path}/course/{frame.filename}"
    plt.savefig(course_path, transparent=True, dpi=config["dpi"])


def build_demo_profile(config, frame):
    plt.rcParams["lines.linewidth"] = config["line_width"]
    # plot connected line width plt.figure(figsize=(width, height))
    # TODO - configure line color
    plt.axis("off")
    test_gpx_filename = "config.gpx"
    if os.path.exists(test_gpx_filename):
        elevation = elevation_from_gpx(test_gpx_filename)
        time = [ii for ii in range(len(elevation))]
    else:
        elevation = [ii for ii in range(100, 0, -1)]
        time = [ii for ii in range(100)]
    plt.plot(
        time,
        elevation,
        color=config["color"],
    )
    # TODO conditionally render sub point
    plt.scatter(
        x=[time[0]],
        y=[elevation[0]],
        color=config[
            "color"
        ],  # TODO - might need to do something about hex/tuple color conversions
        s=config["sub_point"]["point_weight"],
        alpha=config["sub_point"]["opacity"],
        edgecolor="none",
        zorder=2,
    )
    plt.scatter(
        x=[time[0]],
        y=[elevation[0]],
        color=config[
            "color"
        ],  # TODO - might need to do something about hex/tuple color conversions
        s=config["point_weight"],
        zorder=3,
    )
    profile_path = f"{frame.path}/profile/{frame.filename}"
    plt.savefig(profile_path, transparent=True, dpi=config["dpi"])


def build_demo_frame(configs):
    test_data = {}
    demo_frame_filename = "demo_frame_00.png"
    for attribute in constant.ALL_ATTRIBUTES:
        test_data[attribute] = 50
    del test_data[constant.ATTR_COURSE]
    test_data[constant.ATTR_TIME] = datetime.now()

    frame = Frame(
        demo_frame_filename,
        "./tmp",
        configs["scene"]["width"],
        configs["scene"]["height"],
    )

    for attribute, value in test_data.items():
        setattr(frame, attribute, value)
    frame.attributes = list(test_data.keys())

    build_demo_course(configs["course"], frame)
    frame.draw_course(configs["course"])
    build_demo_profile(configs["elevation"], frame)
    frame.draw_profile(configs["elevation"])

    frame.draw(configs)
    # ploting issue on frame refreshes

    # scene = Scene(configs)
    # frame.draw_course_outline(configs[constant.ATTR_COURSE])
    # TODO - use scene here
    # maybe just make it easier and just draw the course without a scene? let's just get something out the door before making it pretty
    return frame.full_path()


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
        show_frame(config_filename)


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


if __name__ == "__main__":
    if len(sys.argv) == 2:
        template_filename = sys.argv[1]
    else:
        template_filename = "blank_template.json"
        blank_template(template_filename)

    modify_template(template_filename)
