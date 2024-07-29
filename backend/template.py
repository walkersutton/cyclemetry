import json
import os
import copy


""""
components are tangible visual elements
"""


def components(template):
    components = {
        "plots": [],
        "labels": [],
        "values": [],
    }
    keys = template.keys()
    if "values" in keys:
        for obj in template["values"]:
            components["values"].append(obj["value"])
    if "labels" in keys:
        for obj in template["labels"]:
            components["labels"].append(obj["label"])
    return components


def merge_configs(parent_config, child_config):
    # not handling nested - not sure if will need to in the future
    for k, v in parent_config.items():
        if k not in child_config.keys():
            child_config[k] = v
    return child_config


def validate_scene_config(config):
    """
    scene keys with backend defaults:
    - font
    """
    keys = config.keys()
    if "font" not in keys:
        config["font"] = "Arial"
    return config


def build_configs(filename):
    # TODO CLEAN
    template = None
    # TODO handle more gracefully
    # this handles both locally running with templates in template folder and api call when templates are stored in tmp directory.
    if not os.path.exists(filename):
        filename = "./../templates/" + filename
    with open(filename, "r") as f:
        template = json.load(f)

    configs = {}
    scene_config = template["scene"]
    scene_config = validate_scene_config(scene_config)
    for clas, config in template.items():
        if clas == "scene":
            configs[clas] = config
        elif clas in ("values", "labels", "plots"):
            if len(config) > 0:
                configs[clas] = []
                for sub_config in config:
                    configs[clas].append(merge_configs(scene_config, sub_config))
    return configs

    configs["scene"] = template["scene"]
    # configs['plots'] = []
    # configs['templates'] = []

    global_config = template["global"]

    desired_components = components(template)
    print(desired_components)
    exit()

    if len(desired_components["values"] > 0):
        configs["values"] = []
        for value_component in desired_components["values"]:
            configs["values"].append(
                merge_configs(global_config, template["values"][""])
            )

    return configs

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
