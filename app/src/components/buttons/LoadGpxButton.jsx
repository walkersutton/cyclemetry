import React from "react";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import saveFile from "./../../api/gpxUtils";

const gpxSchema = {
  allowedType: "application/gpx+xml",
  extension: ".gpx",
  inputId: "file-load-gpx",
};

import useStore from "../../store/useStore";

function LoadGpxButton() {
  const { gpxFilename } = useStore();
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    console.log("📁 File selected:", {
      file: file ? file.name : "none",
      type: file ? file.type : "none",
      expectedType: gpxSchema.allowedType,
    });

    if (!file) {
      console.warn("⚠️ No file selected");
      return;
    }

    // if (file.type === gpxSchema.allowedType) {
      console.log("✅ File type valid, uploading...");
      saveFile(file);
    // } else {
    //   console.error("❌ Invalid file type:", {
    //     received: file.type,
    //     expected: gpxSchema.allowedType,
    //   });
    //   alert(`Invalid file type. Expected GPX file (${gpxSchema.allowedType}), got ${file.type || "unknown"}`);
    // }
  };

  const hasActivity = gpxFilename !== null;

  return (
    <>
      <input
        accept={gpxSchema.extension}
        type="file"
        id={gpxSchema.inputId}
        className="file-input"
        onChange={handleFileChange}
      />
      <OverlayTrigger
        overlay={
          <Tooltip id="tooltip-top">
            {hasActivity ? "WARNING: Loading a new activity will replace your current activity" : "Select an activity GPX"}
          </Tooltip>
        }
        placement={"top"}
      >
        <label
          htmlFor={gpxSchema.inputId}
          className={`btn ${hasActivity ? "btn-warning" : "btn-primary"}`}
        >
          {hasActivity ? "Replace Activity" : "Load Activity"}

        </label>
      </OverlayTrigger>
    </>
  );
}

export default LoadGpxButton;
