import json


def build_config(attribute):
    filename = "scene_config.json"
    with open(filename, "r") as file:
        config = json.load(file)
    attrib_config = config[attribute]
    # todo - need to convert color between hex/tuple - need to figure out which color inputs need which formats
    for key, value in config["global"].items():
        if key not in config[attribute].keys():
            attrib_config[key] = value
    return attrib_config
