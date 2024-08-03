import React from "react";

import uploadGpxFile from "../../api/uploadGpxFile";

const gpxSchema = {
  allowedType: "",
  extension: ".gpx",
  inputId: "file-upload-gpx",
};

let isCustomGpxFileSet = false;

function UploadGpxButton({ handleGpxFilenameStateChange }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === gpxSchema.allowedType) {
      isCustomGpxFileSet = true;
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
      <label
        htmlFor={gpxSchema.inputId}
        className={
          isCustomGpxFileSet ? "btn btn-success m-1" : "btn btn-danger m-1"
        }
      >
        Upload GPX
      </label>
    </>
  );
}

export default UploadGpxButton;
