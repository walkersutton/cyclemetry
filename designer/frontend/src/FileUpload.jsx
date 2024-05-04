import React, { useState } from "react";
import axios from "axios";

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      const postData = new FormData();
      postData.append("file", selectedFile);
      const response = await axios
        .post("http://localhost:8080/gpx/upload", postData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((response) => {
          console.log(response);
          console.log("after uploaded");
        })
        .catch((error) => {
          console.log(error);
          console.log("ah shit");
        });
    } else {
      console.error("No file selected");
    }
  };

  return (
    <div>
      <h2>File Upload</h2>
      {/* TODO allow user to upload new gpx or choose gpx from gpx library. start by forcing explicit upload of gpx*/}
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default FileUpload;
