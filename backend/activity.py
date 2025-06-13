import logging
from collections import defaultdict

import constant
import gpxpy
import numpy as np
from gradient import gradient, smooth_gradients
from scipy.interpolate import interp1d

ATTRIBUTE_MAP = {
    "{http://www.garmin.com/xmlschemas/TrackPointExtension/v1}atemp": "temperature",
    "{http://www.garmin.com/xmlschemas/TrackPointExtension/v1}hr": "heartrate",
    "{http://www.garmin.com/xmlschemas/TrackPointExtension/v1}cad": "cadence",
    "{http://www.garmin.com/xmlschemas/PowerExtension/v1}PowerInWatts": "power",
    "power": "power",
    "{http://www.garmin.com/xmlschemas/GpxExtensions/v3}Temperature": "temperature",
}
PARENT_TAGS = {
    "{http://www.garmin.com/xmlschemas/TrackPointExtension/v1}TrackPointExtension"
}


class Activity:
    def __init__(self, gpx_filename):
        try:
            self.gpx = gpxpy.parse(open(gpx_filename, "r"))
            self.set_valid_attributes()
            self.parse_data()
        except Exception as e:
            logging.error("Activity __init__ error:")
            logging.error(e)

    def set_valid_attributes(self):
        present_attributes = set()
        attribute_map = ATTRIBUTE_MAP
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
            if track_point.latitude and track_point.longitude:
                present_attributes.update({constant.ATTR_COURSE, constant.ATTR_SPEED})
            if track_point.time:
                present_attributes.add(constant.ATTR_TIME)
            if track_point.elevation:
                present_attributes.add(constant.ATTR_ELEVATION)

            for ii, extension in enumerate(track_point.extensions):
                if extension.tag in attribute_map.keys():
                    present_attributes.add(attribute_map[extension.tag])
                    tag_map[attribute_map[extension.tag]] = ((ii, extension.tag),)
                for jj, child_extension in enumerate(extension):
                    if child_extension.tag in attribute_map.keys():
                        present_attributes.add(attribute_map[child_extension.tag])
                        tag_map[attribute_map[child_extension.tag]] = (
                            (ii, extension.tag),
                            (jj, child_extension.tag),
                        )

        if {constant.ATTR_COURSE, constant.ATTR_ELEVATION}.issubset(present_attributes):
            present_attributes.add(constant.ATTR_GRADIENT)

        self.valid_attributes = list(present_attributes)
        self.tag_map = tag_map

    def parse_data(self):
        def parse_attribute(
            tag_map: tuple[int, str], trackpoint: gpxpy.gpx.GPXTrackPoint
        ):
            extension = None
            for index, tag in tag_map:
                extensions = extension if extension else trackpoint.extensions
                if index < len(extensions) and tag == extensions[index].tag:
                    extension = extensions[index]
                else:
                    for e in extensions:
                        if e.tag == tag:
                            extension = e
                            break
                    if extension is None:
                        if index < len(extensions):
                            pass
                            # print("wtf 1")
                        else:
                            pass
                            # print("wtf 2")
                        return 0.0
            return float(extension.text)

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
                    case (
                        constant.ATTR_CADENCE
                        | constant.ATTR_HEARTRATE
                        | constant.ATTR_POWER
                        | constant.ATTR_TEMPERATURE
                    ):
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
            if start > len(data):
                print(
                    f"invalid scene start value in config. Value should be less than {len(data)}. Current value is {start}"
                )
                exit(1)
            if end > len(data) or end < start:
                print(
                    f"invalid scene end value in config. Value should be at most {len(data)} and greater than {start}. Current value is {end}"
                )
                exit(1)
            setattr(self, attribute, data[start:end])
