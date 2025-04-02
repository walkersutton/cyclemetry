import React from "react";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import uploadGpxFile from "../../api/uploadGpxFile";

import {initGpxFilename} from "./../../App";

const gpxSchema = {
  allowedType: "application/gpx+xml",
  extension: ".gpx",
  inputId: "file-upload-gpx",
};

function UploadGpxButton({ gpxFilename, handleGpxFilenameStateChange }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === gpxSchema.allowedType) {
      uploadGpxFile(file, handleGpxFilenameStateChange);
    } else {
      console.log("Invalid file type. Please select a GPX file.");
    }
  };

  const usingStockGpxFile = gpxFilename == initGpxFilename;

  return (
    <>
      <input
        accept={gpxSchema.extension}
        type="file"
        id={gpxSchema.inputId}
        className="file-input"
        onChange={handleFileChange}
      />
      {usingStockGpxFile ? 
      
            <OverlayTrigger
        overlay={
          <Tooltip id="tooltip-top">
            The image above is currently being rendered using a demo activity
          </Tooltip>
        }
        placement={"top"}
      >

      <label htmlFor={gpxSchema.inputId} className="btn btn-warning m-1">
         Load Activity
      </label>
      </OverlayTrigger>
    : 

            <OverlayTrigger
        overlay={
          <Tooltip id="tooltip-top">
            Replace existing activity
          </Tooltip>
        }
        placement={"top"}
      >
      <label htmlFor={gpxSchema.inputId} className="btn btn-success m-1">
        {gpxFilename}
      </label>
      </OverlayTrigger>
}

    </>
  );
}

export default UploadGpxButton;
