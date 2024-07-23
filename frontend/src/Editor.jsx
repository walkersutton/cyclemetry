import React, { useEffect, useRef, useState } from "react";
import { JSONEditor } from "@json-editor/json-editor";
import axios from "axios";

// made a hack schema to get UI working - TODO fix how backend config is structured
import schema from "./config_schema_hack.jsx";

function Editor({ configFile, gpxFile, setImageFilename }) {
  const editorRef = useRef(null);
  const config = {
    use_name_attributes: false,
    theme: "bootstrap4",
    disable_edit_json: true,
    disable_properties: true,
    disable_collapse: false,
    schema: schema,
  };

  const generateDemoFrame = async (config, gpxFile) => {
    if (config && gpxFile) {
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
          console.log("good config file upload");
          console.log(response);
        })
        .catch((error) => {
          console.log(
            "Editor:generateDemoFrame attempting to upload config file"
          );
          console.log(error);
        });

      const data = {
        config_filename: "./tmp/" + configFile.name,
        gpx_filename: "./tmp/" + gpxFile.name,
        // TODO fix this with backend - currently don't want to break docker image
        // config_filename: configFilename,
        // gpx_filename: gpxFile.name,
      };
      await axios
        .post(process.env.REACT_APP_FLASK_SERVER_URL + "/demo", data)
        .then((response) => {
          setImageFilename(response.data.data);
        })
        .catch((error) => {
          console.log("Editor:generateDemoFrame");
          console.log(error);
        });
    }
  };

  useEffect(() => {
    const editor = new JSONEditor(editorRef.current, config);
    // TODO
    // add override to upload config from file system
    editor.on("change", function () {
      generateDemoFrame(editor.getValue(), gpxFile);
      // document.querySelector('#input').value = JSON.stringify(editor.getValue())
    });
    return () => {
      editor.destroy(); // Destroy the JSONEditor instance when component unmounts
    };
  }, [configFile, gpxFile]); // Empty dependency array to run the effect only once after the initial render

  return <div ref={editorRef} />;
}

export default Editor;
