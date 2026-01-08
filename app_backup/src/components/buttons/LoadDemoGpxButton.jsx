import React from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import useStore from "../../store/useStore";

function LoadDemoGpxButton() {
  const {
    gpxFilename,
    setGpxFilename,
    setDummyDurationSeconds,
    setStartSecond,
    setEndSecond,
    setSelectedSecond,
  } = useStore();

  const handleLoadDemo = () => {
    console.log("🎯 Loading demo GPX file");
    setGpxFilename("demo.gpxinit");

    // Set demo activity duration (demo.gpxinit -> seward.gpx has 7946 seconds)
    const demoDuration = 7946;
    console.log("✅ Setting demo duration:", demoDuration, "seconds");
    setDummyDurationSeconds(demoDuration);
    setStartSecond(0);
    setEndSecond(demoDuration);
    setSelectedSecond(0);

    console.log("✅ Demo GPX loaded");
  };

  const hasActivity = gpxFilename !== null;

  return (
    <OverlayTrigger
      overlay={
        <Tooltip id="tooltip-demo-gpx">
          {hasActivity
            ? "Load demo activity (will replace current activity)"
            : "Load demo activity to try out the app"}
        </Tooltip>
      }
      placement="top"
    >
      <Button
        variant={hasActivity ? "outline-secondary" : "primary"}
        size="sm"
        onClick={handleLoadDemo}
      >
        {hasActivity ? "Load Demo" : "Try Demo Activity"}
      </Button>
    </OverlayTrigger>
  );
}

export default LoadDemoGpxButton;
