import json

import gpxpy

import constant


def gpx_attribute_map(filename="gpx_attribute_map.json"):
    with open(filename, "r") as file:
        return json.load(file)


class Gpx:
    def __init__(self, filename):
        self.gpx = gpxpy.parse(open(filename, "r"))
        self.set_attributes()

    def parse_data(self, attributes: list[str]):
        def parse_attribute(index: tuple[int], trackpoint: gpxpy.gpx.GPXTrackPoint):
            if len(index) == 2:
                return trackpoint.extensions[index[0]][index[1]].text
            else:
                return trackpoint.extensions[index[0]].text

        data = {}
        for attribute in attributes:
            data[attribute] = []
        for point in self.gpx.tracks[0].segments[0].points:
            for attribute in attributes:
                match attribute:
                    case constant.ATTR_COURSE:
                        data[attribute].append((point.latitude, point.longitude))
                    case constant.ATTR_ELEVATION:
                        data[attribute].append(point.elevation)
                    case constant.ATTR_CADENCE | constant.ATTR_HEARTRATE | constant.ATTR_POWER | constant.ATTR_TEMPERATURE:
                        data[attribute].append(
                            parse_attribute(self.tag_map[attribute], point)
                        )
                    case constant.ATTR_SPEED:
                        pass
                        # build speed on gpx from lat lon / course
                    case _:
                        exit("invalid attribute provided")
        for attribute in attributes:
            setattr(self, attribute, data[attribute])

    def set_attributes(self):
        attributes = set()
        attribute_map = gpx_attribute_map()
        tag_map = {}
        trackpoint = self.gpx.tracks[0].segments[0].points[0]
        attributes.add(
            constant.ATTR_COURSE
        ) if trackpoint.latitude and trackpoint.longitude else None
        attributes.add(constant.ATTR_TIME) if trackpoint.time else None
        attributes.add(constant.ATTR_ELEVATION) if trackpoint.elevation else None
        for ii, extension in enumerate(trackpoint.extensions):
            if extension.tag in attribute_map.keys():
                attributes.add(attribute_map[extension.tag])
                tag_map[attribute_map[extension.tag]] = [ii]
            for jj, child_extension in enumerate(extension):
                if child_extension.tag in attribute_map.keys():
                    attributes.add(attribute_map[child_extension.tag])
                    tag_map[attribute_map[child_extension.tag]] = [ii, jj]
        self.attributes = list(attributes)
        self.tag_map = tag_map
