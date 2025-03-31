import React from "react";

import uploadGpxFile from "../../api/uploadGpxFile";

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

  return (
    <>
      <input
        accept={gpxSchema.extension}
        type="file"
        id={gpxSchema.inputId}
        className="file-input"
        onChange={handleFileChange}
      />
      <label htmlFor={gpxSchema.inputId} className="btn btn-danger m-1">
        {gpxFilename ?? "Upload GPX"}
      </label>
    </>
  );
}

export default UploadGpxButton;
