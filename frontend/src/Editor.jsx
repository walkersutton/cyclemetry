import React, { useEffect, useRef } from "react";
import { JSONEditor } from "@json-editor/json-editor";
import generateDemoFrame from "./api/generateDemoFrame.jsx";

// made a hack schema to get UI working - TODO fix how backend config is structured
// import schema from "./config_schema_hack.jsx";
import schema from "./config_schema.jsx";

// TODO - make this an informative how to screen - multiple labels
const initConfig = { labels: [{ text: "starting fresh", font_size: 69 }] };
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
