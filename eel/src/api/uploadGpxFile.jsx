import axios from "axios";

async function uploadGpxFile(gpxFile, handleGpxFilenameStateChange) {
  const postData = new FormData();
  postData.append("file", gpxFile);
  // TODO
  // handle bad gpx uploads more gracefully - currently have to click through a bunch of browswer alerts to dismiss
  console.log("in uploadgpxaxios call");
  // alert("hitting function call)")
  await axios
    .post("/upload", postData, {
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
