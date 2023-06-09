import json

import gpxpy

import constant


def attribute_map(filename="gpx_attribute_map.json"):
    with open(filename, "r") as file:
        return json.load(file)


class Gpx:
    def __init__(self, filename):
        self.gpx = gpxpy.parse(open(filename, "r"))

    def parse_data(self, attributes: list[str]):
        data = {}
        for attribute in attributes:
            data[attribute] = []
        for point in self.gpx.tracks[0].segments[0].points:
            for attribute in attributes:
                match attribute:
                    case constant.ATTR_CADENCE:
                        pass
                        # data[attribute].append()
                    case constant.ATTR_COURSE:
                        data[attribute].append((point.latitude, point.longitude))
                    case constant.ATTR_ELEVATION:
                        data[attribute].append(point.elevation)
                    case constant.ATTR_HEARTRATE:
                        pass
                    case constant.ATTR_POWER:
                        pass
                    case constant.ATTR_SPEED:
                        pass  # probably do after lat long is made? or just do here, and store temp values
                    case constant.ATTR_TIME:
                        pass
                    case constant.ATTR_TEMPERATURE:
                        pass
                    case _:
                        exit("invalid attribute provided")

        for attribute in attributes:
            setattr(self, attribute, data[attribute])

    def existing_attributes(self):
        attributes = set()
        trackpoint = self.gpx.tracks[0].segments[0].points[0]
        attributes.add(
            constant.ATTR_COURSE
        ) if trackpoint.latitude and trackpoint.longitude else None
        attributes.add(constant.ATTR_TIME) if trackpoint.time else None
        attributes.add(constant.ATTR_ELEVATION) if trackpoint.elevation else None
        for extension in trackpoint.extensions:
            if extension.tag in attribute_map().keys():
                attributes.add(attribute_map()[extension.tag])
            for child_extension in extension:
                if child_extension.tag in attribute_map().keys():
                    attributes.add(attribute_map()[child_extension.tag])
        return list(attributes)

    # TODO - need to build path to tags - could be child, could be parent!
    def attribute_tag_mappings(self):
        pass
