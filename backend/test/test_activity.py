import sys
import os

parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, parent_dir)

from activity import Activity
from constant import NO_INTERPOLATE_ATTRIBUTES


class TestActivity:
    def build_data_map(self):
        data_map = {}
        for attribute in self.activity.valid_attributes:
            data_map[attribute] = getattr(self.activity, attribute)
        return data_map

    def setup_method(self, method):
        self.resource = "some setup"
        self.activity = Activity(
            # "/Users/walker/github.com/cyclemetry/backend/test/test.gpx"
            "/Users/walker/github.com/cyclemetry/backend/vpcrit.gpx"
        )

    def test_interpolate(self):
        data_map_original = self.build_data_map()
        fps = 30
        self.activity.interpolate(fps)
        interpolated_data_map = self.build_data_map()
        for attribute in self.activity.valid_attributes:
            raw_list = data_map_original[attribute]
            int_list = interpolated_data_map[attribute]
            min_raw_val, max_raw_val = min(raw_list), max(raw_list)
            for int_val in int_list:
                assert min_raw_val <= int_val <= max_raw_val

            # if attribute not in NO_INTERPOLATE_ATTRIBUTES:
            #     fps = 30
            #     lrl = len(raw_list) * fps
            #     print('hereeeeeeeeeeeeeeeeee walker')
            #     print(attribute)
            #     assert abs(lrl - len(int_list)) <= fps


# TestActivity().test_one()
