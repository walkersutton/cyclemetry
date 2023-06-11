import json
from collections import defaultdict

import gpxpy
import numpy as np
from gpxpy.geo import Location
from scipy.interpolate import interp1d

import constant


def gpx_attribute_map(filename="gpx_attribute_map.json"):
    with open(filename, "r") as file:
        return json.load(file)


class Gpx:
    def __init__(self, filename):
        self.gpx = gpxpy.parse(open(filename, "r"))
        self.set_valid_attributes()
        self.parse_data()

    def set_valid_attributes(self):
        attributes = set()
        attribute_map = gpx_attribute_map()
        tag_map = {}
        track_point = self.gpx.tracks[0].segments[0].points[0]
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
        if constant.ATTR_GRADIENT in self.valid_attributes:
            # TODO might be a better way to start gradient?? idk lol
            # TODO fix this garbage
            point = track_segment.points[1]
            next_point = track_segment.points[2]
            last_location = Location(
                point.latitude - (next_point.latitude - point.latitude),
                point.longitude - (next_point.longitude - point.longitude),
                point.elevation - (next_point.elevation - point.elevation),
            )
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
                    case constant.ATTR_GRADIENT:
                        location = Location(
                            point.latitude, point.longitude, point.elevation
                        )
                        data[attribute].append(
                            gpxpy.geo.elevation_angle(
                                location1=last_location, location2=location
                            )
                        )
                        last_location = location
                    case constant.ATTR_CADENCE | constant.ATTR_HEARTRATE | constant.ATTR_POWER | constant.ATTR_TEMPERATURE:
                        data[attribute].append(
                            parse_attribute(self.tag_map[attribute], point)
                        )
        for attribute in self.valid_attributes:
            setattr(self, attribute, data[attribute])

    def interpolate(self, fps: int):
        for attribute in self.valid_attributes:
            if attribute in constant.NO_INTERPOLATE_ATTRIBUTES:
                continue
            data = getattr(self, attribute)
            time = np.arange(len(data))
            interp_func = interp1d(time, data)
            new_time = np.arange(time[0], time[-1], 1 / fps)
            interpolated = interp_func(new_time).tolist()

            data = []
            batch = []
            for ii in range(len(interpolated)):
                if ii % fps == 0 and ii != 0:
                    data.append(batch)
                    batch = []
                batch.append(interpolated[ii])
            data.append(batch)

            setattr(self, attribute, data)
