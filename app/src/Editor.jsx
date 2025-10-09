import React, { useEffect, useRef, useCallback } from "react";
import { JSONEditor } from "@json-editor/json-editor";
import generateDemoFrame from "./api/generateDemoFrame.jsx";
import schema from "./config_schema.jsx";
import useStore, { isUpdatingFromTimelineFlag } from "./store/useStore.js";

const editorConfig = {
  use_name_attributes: false,
  theme: "bootstrap5",
  disable_edit_json: true,
  disable_collapse: false,
  schema: schema,
};

function Editor(props) {
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const isInitializing = useRef(false);
  // Prevent duplicate initialization under React 18 StrictMode in development
  const hasInitializedRef = useRef(false);
  const { config, setConfig, setEditor } = useStore();

  const handleEditorChange = useCallback(
    async (editor) => {
      if (isInitializing.current) {
        console.log("Editor change blocked - still initializing");
        return;
      }

      // Don't trigger if we're updating from timeline
      if (isUpdatingFromTimelineFlag()) {
        console.log("Editor change blocked - updating from timeline");
        return;
      }

      try {
        const newConfig = editor.getValue();
        console.log("Editor change detected, updating config");
        setConfig(newConfig);
        await generateDemoFrame(newConfig);
      } catch (error) {
        console.error("Error in generateDemoFrame:", error);
      }
    },
    [setConfig]
  );

  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log("Editor already initialized, skipping");
      return;
    }

    console.log("Initializing editor");
    const editor = new JSONEditor(editorRef.current, editorConfig);
    editorInstanceRef.current = editor;
    hasInitializedRef.current = true;

    editor.on("ready", function () {
      console.log("Editor ready, setting up");
      setEditor(editor);
      if (config) {
        console.log("Setting initial config value");
        isInitializing.current = true;
        editor.setValue(config);
        setTimeout(() => {
          console.log("Initialization complete");
          isInitializing.current = false;
        }, 100); // Increased timeout
      }
    });

    editor.on("change", () => {
      console.log("Editor change event fired");
      handleEditorChange(editor);
    });

    return () => {
      console.log("Cleaning up editor");
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      // Allow re-initialization on next mount (React 18 StrictMode double-invokes effects)
      hasInitializedRef.current = false;
    };
  }, [handleEditorChange, setEditor]);

  return <div ref={editorRef} className="json-editor-container" />;
}

export default Editor;
