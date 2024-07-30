import axios from "axios";
import isEqual from "lodash/isEqual";

import { initConfig } from "../Editor";
async function generateDemoFrame(
  editor,
  gpxFilename,
  handleGeneratingImageStateChange,
  handleImageFilenameStateChange
) {
  if (!gpxFilename) {
    console.log("missing gpx file");
    return;
  }
  if (editor) {
    const config = editor.getValue();
    if (isEqual(config, initConfig) && gpxFilename == ".demo.gpx") {
      handleImageFilenameStateChange(".demo.png");
      return;
    }
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
    handleGeneratingImageStateChange(true);
    await axios
      .post(process.env.REACT_APP_FLASK_SERVER_URL + "/upload", postData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        // console.log(response);
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
        handleGeneratingImageStateChange(false);
        handleImageFilenameStateChange(response.data.data);
      })
      .catch((error) => {
        handleGeneratingImageStateChange(false);
        console.log("generateDemoFrame /demo error");
        console.log(error);
        alert(error);
      });
  } else {
    console.log("BAD BAD BAD generateDemoFrame");
  }
}

export default generateDemoFrame;
