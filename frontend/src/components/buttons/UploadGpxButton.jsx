import React from "react";
import axios from "axios";

const gpxSchema = {
  allowedType: "",
  extension: ".gpx",
  inputId: "file-upload-gpx",
};

async function handleUpload(gpxFile, handleGpxFileStateChange) {
  const postData = new FormData();
  postData.append("file", gpxFile);
  await axios
    .post(process.env.REACT_APP_FLASK_SERVER_URL + "/upload", postData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      handleGpxFileStateChange(gpxFile);
    })
    .catch((error) => {
      console.log("UploadGpxButton:handleUpload");
      console.log(error);
      handleGpxFileStateChange(null);
    });
}

function UploadGpxButton({ gpxFile, handleGpxFileStateChange }) {
  const handleFileChange = (event) => {
    const f = event.target.files[0];
    if (f && f.type === gpxSchema.allowedType) {
      handleUpload(f, handleGpxFileStateChange);
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
