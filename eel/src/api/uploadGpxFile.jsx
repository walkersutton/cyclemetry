import axios from "axios";

async function uploadGpxFile(gpxFile, handleGpxFilenameStateChange) {
  const postData = new FormData();
  postData.append("file", gpxFile);
  // TODO
  // handle bad gpx uploads more gracefully - currently have to click through a bunch of browswer alerts to dismiss
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

export default uploadGpxFile;
