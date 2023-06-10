import json


def build_config(attribute):
    filename = "templates/default_scene.json"
    with open(filename, "r") as file:
        config = json.load(file)
    attrib_config = config[attribute]
    for key, value in config["global"].items():
        if key not in config[attribute].keys():
            attrib_config[key] = value
    # TODO dont make text_color required - pull from primary_color/secondar_color?

    # maybe make this a helper
    for key, value in attrib_config.items():
        if key == "text_color" and type(value) == list:
            attrib_config[key] = tuple(value)
        elif key == "text_color" and type(value) == str:
            attrib_config[key] = tuple(
                int(value.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4)
            )
    return attrib_config
