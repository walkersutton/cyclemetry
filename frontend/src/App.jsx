import React, { useState } from "react";

import Editor from "./Editor";
import PreviewPanel from "./PreviewPanel";
import FlaskServerStatus from "./FlaskServerStatus";
import logo from "./logo.webp";

function App() {
  const [configFile, setConfigFile] = useState(null);
  const [gpxFile, setGpxFile] = useState(null);
  const [imageFilename, setImageFilename] = useState(null);
  const [editor, setEditor] = useState(null);

  const handleConfigFileStateChange = (state) => {
    setConfigFile(state);
  };
  const handleGpxFileStateChange = (state) => {
    setGpxFile(state);
  };
  const handleImageFileStateChange = (state) => {
    setImageFilename(state);
  };
  const handleEditorStateChange = (state) => {
    setEditor(state);
  };

  const downloadTemplate = () => {
    const jsonString = JSON.stringify(editor.getValue(), null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyclemetry_template.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const templateSchema = {
    allowedType: "application/json",
    extension: ".json",
    inputId: "file-upload-template",
  };

  const uploadTemplate = (event) => {
    // TODO make this a tooltip with react-bootstrap
    // alert(
    //   "uploading a template will overwrite your existing template configuration"
    // );
    const f = event.target.files[0];
    if (f && f.type === templateSchema.allowedType) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const fileContent = e.target.result;
        try {
          const jsonContent = JSON.parse(fileContent);
          editor.setValue(jsonContent);
          // setConfigFile(f);
          // having an issue where sometimes, before gpx file is set, template editor doesn't update values with uploaded tempalte values
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      reader.onerror = function (e) {
        console.error("Error reading file:", e.target.error);
      };
      reader.readAsText(f);
    } else {
      console.log("oh shit.");
    }
  };

  return (
    <>
      <FlaskServerStatus />
      <main>
        <div className="d-flex flex-column p-3">
          <div className="card bg-light p-3 mb-3">
            <a href="/" className="text-decoration-none text-dark">
              <img src={logo} alt="Cyclemetry logo" className="logo" />
              <strong>cyclemetry</strong>
            </a>
            <input
              accept={templateSchema.extension}
              type="file"
              id={templateSchema.inputId}
              className="file-input"
              onChange={uploadTemplate}
            />
            <label
              htmlFor={templateSchema.inputId}
              className="btn btn-warning ms-4"
            >
              Upload Template
            </label>
            <button
              type="button"
              className="btn btn-primary ms-3"
              onClick={downloadTemplate}
            >
              Download Template
            </button>
          </div>
          <Editor
            configFile={configFile}
            gpxFile={gpxFile}
            setImageFilename={handleImageFileStateChange}
            setEditor={handleEditorStateChange}
          />
        </div>
        <div>
          <PreviewPanel
            gpxFile={gpxFile}
            imageFilename={imageFilename}
            handleGpxFileStateChange={handleGpxFileStateChange}
          />
        </div>
      </main>
    </>
  );
}

export default App;
