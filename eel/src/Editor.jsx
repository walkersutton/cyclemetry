import React, { useEffect, useRef } from "react";
import { JSONEditor } from "@json-editor/json-editor";

import generateDemoFrame from "./api/generateDemoFrame.jsx";
import schema from "./config_schema.jsx";

export const initConfig = {
  scene: {
    color: "#ffffff",
    height: 230,
    width: 900,
  },
  labels: [
    {
      text: "Welcome to the Cyclemetry Template Editor!",
      font_size: 40,
      x: 50,
      y: 40,
    },
    {
      text: "Modify the template properties to change this image overlay",
      font_size: 30,
      x: 50,
      y: 110,
    },
    {
      text: "Upload a GPX file to change the underlying data",
      font_size: 30,
      x: 50,
      y: 150,
    },
  ],
};
let config = null;

function Editor({
  gpxFilename,
  gpxFilestring,
  handleEditorStateChange,
  handleGeneratingImageStateChange,
  handleImageFilenameStateChange,
}) {
  const editorRef = useRef(null);
  const editorConfig = {
    use_name_attributes: false,
    theme: "bootstrap5",
    disable_edit_json: true,
    disable_properties: false,
    disable_collapse: false,
    schema: schema,
  };

  useEffect(() => {
    const editor = new JSONEditor(editorRef.current, editorConfig);
    editor.on("ready", function () {
      handleEditorStateChange(editor);
      if (config) {
        editor.setValue(config);
      } else {
        editor.setValue(initConfig);
      }
    });
    editor.on("change", async function () {
      // TODO - do config validation before calling generate and assigning to current config - probably helper function
      await generateDemoFrame(
        editor,
        gpxFilestring,
        handleGeneratingImageStateChange,
        handleImageFilenameStateChange
      );
      config = editor.getValue();
    });
    return () => {
      editor.destroy();
    };
  }, [gpxFilename, gpxFilestring]);

  return <div ref={editorRef} />;
}

export default Editor;
