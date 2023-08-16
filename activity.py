import json
from collections import defaultdict

import gpxpy
import numpy as np
from scipy.interpolate import interp1d

import constant
from gradient import gradient, smooth_gradients


def gpx_attribute_map(filename="gpx_attribute_map.json"):
    with open(filename, "r") as file:
        return json.load(file)


class Activity:
    def __init__(self, filename):
        self.gpx = gpxpy.parse(open(filename, "r"))
        self.set_valid_attributes()
        self.parse_data()

    def set_valid_attributes(self):
        attributes = set()
        attribute_map = gpx_attribute_map()
        tag_map = {}
        track_points = self.gpx.tracks[0].segments[0].points
        # not all extensions are present in all track points
        # TODO this needs work - probably don't need to set attributes - should be able to parse data in single pass
        track_points = [
            track_points[0],
            track_points[len(track_points) // 2],
            track_points[-1],
        ]
        for track_point in track_points:
            attributes.update(
                {constant.ATTR_COURSE, constant.ATTR_SPEED}
            ) if track_point.latitude and track_point.longitude else None
            attributes.add(constant.ATTR_TIME) if track_point.time else None
            attributes.add(constant.ATTR_ELEVATION) if track_point.elevation else None
            for ii, extension in enumerate(track_point.extensions):
                if extension.tag in attribute_map.keys():
                    attributes.add(attribute_map[extension.tag])
                    tag_map[attribute_map[extension.tag]] = [ii]
                for jj, child_extension in enumerate(extension):
                    if child_extension.tag in attribute_map.keys():
                        attributes.add(attribute_map[child_extension.tag])
                        tag_map[attribute_map[child_extension.tag]] = [ii, jj]
            if {constant.ATTR_COURSE, constant.ATTR_ELEVATION}.issubset(attributes):
                attributes.add(constant.ATTR_GRADIENT)

        self.valid_attributes = list(attributes)
        self.tag_map = tag_map

    def parse_data(self):
        def parse_attribute(index: tuple[int], trackpoint: gpxpy.gpx.GPXTrackPoint):
            value = trackpoint.extensions[index[0]]
            if len(index) == 2:
                value = value[index[1]]  # index indicates it's a child extension
            return float(value.text)

        data = defaultdict(list)
        track_segment = self.gpx.tracks[0].segments[0]
        previous_point = None
        for ii, point in enumerate(track_segment.points):
            for attribute in self.valid_attributes:
                match attribute:
                    case constant.ATTR_COURSE:
                        data[attribute].append((point.latitude, point.longitude))
                    case constant.ATTR_ELEVATION:
                        data[attribute].append(point.elevation)
                    case constant.ATTR_TIME:
                        data[attribute].append(point.time)
                    case constant.ATTR_SPEED:
                        data[attribute].append(track_segment.get_speed(ii))
                        # data[attribute].append(point.speed) - for some reason, point.speed isn't interpreted correctly (always None). maybe try other gpx files to see if it works in other cases?
                    case constant.ATTR_GRADIENT:
                        data[attribute].append(gradient(point, previous_point))
                    case constant.ATTR_CADENCE | constant.ATTR_HEARTRATE | constant.ATTR_POWER | constant.ATTR_TEMPERATURE:
                        data[attribute].append(
                            parse_attribute(self.tag_map[attribute], point)
                        )
            previous_point = point

        for attribute in self.valid_attributes:
            if attribute == constant.ATTR_GRADIENT:
                data[attribute] = smooth_gradients(data[attribute])
            setattr(self, attribute, data[attribute])

    def interpolate(self, fps: int):
        def helper(data):
            data.append(2 * data[-1] - data[-2])
            x = np.arange(len(data))
            interp_func = interp1d(x, data)
            new_x = np.arange(x[0], x[-1], 1 / fps)
            return interp_func(new_x).tolist()

        for attribute in self.valid_attributes:
            if attribute in constant.NO_INTERPOLATE_ATTRIBUTES:
                continue
            data = getattr(self, attribute)
            if attribute == constant.ATTR_COURSE:
                new_lat = helper([ele[0] for ele in data])
                new_lon = helper([ele[1] for ele in data])
                new_data = list(zip(new_lat, new_lon))
            else:
                new_data = helper(data)
            setattr(self, attribute, new_data)

    def trim(self, start, end):
        for attribute in self.valid_attributes:
            data = getattr(self, attribute)
            setattr(self, attribute, data[start:end])
