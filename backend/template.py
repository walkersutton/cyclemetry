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
    # TODO implement
    pass


def build_configs(filename):
    # TODO CLEAN
    template = None
    # this handles both locally running with templates in template folder and api call when templates are stored in tmp directory. TODO handle more gracefully
    if not os.path.exists(filename):
        filename = "./../templates/" + filename
    with open(filename, "r") as f:
        template = json.load(f)

    configs = {}
    for k, v in template.items():
        if k == "scene":
            configs[k] = v
        elif k == "global":
            pass
        else:
            if len(v) > 0:
                configs[k] = []
                for obj in v:
                    configs[k].append(obj)
                    # TODO configs[k].append(merge_configs(global_config, obj))
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
