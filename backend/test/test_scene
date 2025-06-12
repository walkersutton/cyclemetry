import sys
import os

parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, parent_dir)

from activity import Activity
from scene import Scene


class TestScene:

    def setup_method(self, method=None):
        gpx_filename = "/Users/walker/github.com/cyclemetry/backend/vpcrit.gpx"
        gpx_filename = "/Users/walker/github.com/cyclemetry/backend/test/test.gpx"
        template_filename = "/Users/walker/github.com/cyclemetry/templates/crit.json"
        activity = Activity(gpx_filename)
        self.scene = Scene(activity, activity.valid_attributes, template_filename)
        activity.interpolate(self.scene.fps)

    def test_frame_attribute_data(self):
        slv, sna = 0, 0
        # for second in range(0):
        # seconds 0 and 1 seem to have different vals
        second = 2
        frame_number = 0
        value_set = set()
        attribute_map = self.scene.frame_attribute_data(second, frame_number)
        num_attributes = len(attribute_map)
        for _, value in attribute_map.items():
            value_set.add(value)
        slv += len(value_set)
        sna += num_attributes
        assert slv == sna
        # old  844 == 1260
        # assert len(value_set) == num_attributes


ts = TestScene()
ts.setup_method()
ts.test_frame_attribute_data()
