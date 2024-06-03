import React, { useEffect, useRef, useState } from "react";
import { JSONEditor } from "@json-editor/json-editor";
import axios from "axios";

import schema from "./config_schema.jsx";

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

  const generateDemoFrame = async (configFile, gpxFile) => {
    if (configFile && gpxFile) {
      const data = {
        config_filename: "./tmp/" + configFile.name,
        gpx_filename: "./tmp/" + gpxFile.name,
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

    editor.on("change", function () {
      generateDemoFrame(configFile, gpxFile);
      // document.querySelector('#input').value = JSON.stringify(editor.getValue())
    });
    return () => {
      editor.destroy(); // Destroy the JSONEditor instance when component unmounts
    };
  }, [configFile, gpxFile]); // Empty dependency array to run the effect only once after the initial render

  return <div ref={editorRef} />;
}

export default Editor;
