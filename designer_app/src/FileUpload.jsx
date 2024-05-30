import React, { useEffect, useState } from "react";
import axios from "axios";

const configs = {
  gpx: {
    allowedType: "",
    extension: ".gpx",
    inputId: "file-upload-gpx",
    name: "GPX",
  },
  config: {
    allowedType: "application/json",
    extension: ".json",
    inputId: "file-upload-config",
    name: "Config",
  },
};

async function handleUpload(file, setFile, setFileId) {
  const postData = new FormData();
  postData.append("file", file);
  await axios
    .post(process.env.REACT_APP_FLASK_SERVER_URL + "/upload", postData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      setFileId(response.data.data);
    })
    .catch((error) => {
      setFile(null);
    });
}

function FileUpload({ type, setFileId }) {
  const [file, setFile] = useState(null);

  const config = configs[type];

  const handleFileChange = (event) => {
    const f = event.target.files[0];
    if (f && f.type === config.allowedType) {
      setFile(f);
    } else {
      alert("Invalid file type. Please select a " + config.name + " file.");
    }
  };

  useEffect(() => {
    if (file) {
      handleUpload(file, setFile, setFileId);
    }
  }, [file, setFile]);

  return (
    <div className="file-upload-container">
      <input
        accept={config.extension}
        type="file"
        id={config.inputId}
        className="file-input"
        onChange={handleFileChange}
      />
      <label
        htmlFor={config.inputId}
        className="file-upload-button"
        style={{ backgroundColor: file ? "green" : "red" }}
      >
        {file ? file.name : "upload " + config.name + " file"}
      </label>
    </div>
  );
}

export default FileUpload;
