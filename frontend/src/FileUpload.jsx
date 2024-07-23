import React from "react";
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

async function handleUpload(file, setFile) {
  const postData = new FormData();
  postData.append("file", file);
  await axios
    .post(process.env.REACT_APP_FLASK_SERVER_URL + "/upload", postData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      setFile(file);
    })
    .catch((error) => {
      console.log("FileUpload:handleUpload");
      console.log(error);
      setFile(null);
    });
}

function FileUpload({ type, file, setFile }) {
  const config = configs[type];

  const handleFileChange = (event) => {
    const f = event.target.files[0];
    if (f && f.type === config.allowedType) {
      handleUpload(f, setFile);
    } else {
      alert("Invalid file type. Please select a " + config.name + " file.");
    }
  };

  const mockit = (event) => {
    const mockFile = new File([], "sweard20.gpx", {
      type: "application/gpx+xml",
    });
    setFile(mockFile);
  };

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
      {file === null && (
        <div className="pt-4">
          <p>or</p>
          <button
            onClick={mockit}
            className="file-upload-button"
          >
            {file ? null : "use a playground " + config.name + " file"}
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
