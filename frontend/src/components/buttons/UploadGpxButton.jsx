import React from "react";
import axios from "axios";

const gpxSchema = {
  allowedType: "",
  extension: ".gpx",
  inputId: "file-upload-gpx",
};

async function handleGpxUpload(gpxFile, handleGpxFilenameStateChange) {
  const postData = new FormData();
  postData.append("file", gpxFile);
  // TODO
  // handle bad gpx uploads more gracefully - currently have to click through a bunch of browswer alerts to dismiss
  // also - probably refactor this into a module under /api
  await axios
    .post(process.env.REACT_APP_FLASK_SERVER_URL + "/upload", postData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      handleGpxFilenameStateChange(gpxFile["name"]);
    })
    .catch((error) => {
      console.log("UploadGpxButton:handleUpload");
      console.log(error);
      handleGpxFilenameStateChange(null);
    });
}

function UploadGpxButton({ handleGpxFilenameStateChange }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === gpxSchema.allowedType) {
      handleGpxUpload(file, handleGpxFilenameStateChange);
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
      <label htmlFor={gpxSchema.inputId} className="btn btn-primary">
        Upload GPX
      </label>
    </>
  );
}

export default UploadGpxButton;
