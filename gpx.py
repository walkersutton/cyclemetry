import json

import gpxpy


def attribute_map(filename="gpx_attribute_map.json"):
    with open(filename, "r") as file:
        return json.load(file)


class Gpx:
    def __init__(self, filename):
        self.gpx = gpxpy.parse(open(filename, "r"))

    def set_lat_lon_ele(self):
        lat, lon, ele = [], [], []
        for point in self.gpx.tracks[0].segments[0].points:
            ele.append(point.elevation)
            lat.append(point.latitude)
            lon.append(point.longitude)
        self.ele = ele
        self.lat = lat
        self.lon = lon

    def existing_attributes(self):
        attributes = set()
        trackpoint = self.gpx.tracks[0].segments[0].points[0]
        attributes.add(
            "course"
        ) if trackpoint.latitude and trackpoint.longitude else None
        attributes.add("time") if trackpoint.time else None
        attributes.add("elevation") if trackpoint.elevation else None
        for extension in trackpoint.extensions:
            if extension.tag in attribute_map().keys():
                attributes.add(attribute_map()[extension.tag])
            for child_extension in extension:
                if child_extension.tag in attribute_map().keys():
                    attributes.add(attribute_map()[child_extension.tag])
        return list(attributes)
        # TODO - probably need to return path to tags - could be child, could be parent!
