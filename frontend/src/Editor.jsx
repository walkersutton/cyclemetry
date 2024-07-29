import React, { useEffect, useRef } from "react";
import { JSONEditor } from "@json-editor/json-editor";

import generateDemoFrame from "./api/generateDemoFrame.jsx";
import schema from "./config_schema.jsx";

const initConfig = {
  labels: [
    { text: "Welcome to the Cyclemetry Template Editor!", font_size: 80, x: 50, y: 40 },
    { text: "Upload a GPX file to get started", font_size: 50, x: 50, y: 200 },
    { text: "No GPX file? Get started with the GPX Demo below", font_size: 50, x: 50, y: 270 },
  ],
};
let config = null;

function Editor({
  gpxFilename,
  handleEditorStateChange,
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
    editor.on("change", function () {
      // TODO - do config validation before calling generate and assigning to current config - probably helper function
      generateDemoFrame(editor, gpxFilename, handleImageFilenameStateChange);
      config = editor.getValue();
    });
    return () => {
      editor.destroy();
    };
  }, [gpxFilename]);

  return <div ref={editorRef} />;
}

export default Editor;
