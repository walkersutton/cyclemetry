import axios from "axios";

async function generateDemoFrame(
  editor,
  gpxFilename,
  handleImageFilenameStateChange
) {
  if (!gpxFilename) {
    console.log("missing gpx file");
    return;
  }
  if (editor) {
    const config = editor.getValue();
    // we should validate the config - maybe do this in editor, since it's a tigter jump
    // const errors = editor.validate(); -> not sure if this is sufficient - at minimum, should pass required checks of schema
    const configJson = JSON.stringify(config);
    // TODO - remove this shitty hack of an upload pattern
    const configFilename = "myconfig.json";
    const configFile = new File([configJson], configFilename, {
      type: "application/json",
    });
    const postData = new FormData();
    postData.append("file", configFile);
    await axios
      .post(process.env.REACT_APP_FLASK_SERVER_URL + "/upload", postData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log("generateDemoFrame failed to upload config file");
        console.log(error);
      });

    const data = {
      config_filename: "./tmp/" + configFilename,
      gpx_filename: "./tmp/" + gpxFilename,
      // TODO fix this with backend - currently don't want to break docker image
      // config_filename: configFilename,
      // gpx_filename: gpxFilename
    };
    await axios
      .post(process.env.REACT_APP_FLASK_SERVER_URL + "/demo", data)
      .then((response) => {
        handleImageFilenameStateChange(response.data.data);
        console.log(response.data.data);
        console.log("successfully updated demo frmae");
      })
      .catch((error) => {
        console.log("generateDemoFrame /demo error");
        console.log(error);
        alert(error);
      });
  } else {
    console.log("BAD BAD BAD generateDemoFrame");
  }
}

export default generateDemoFrame;
