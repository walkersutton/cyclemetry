import React, { useState } from "react";

import Editor from "./Editor"; // Import the MyJsonEditor component
import PreviewPanel from "./PreviewPanel";
import FlaskServerStatus from "./FlaskServerStatus";

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
    link.download = "template.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <FlaskServerStatus />
      <main>
        <div class="d-flex flex-column p-3" style={{ width: "200px;" }}>
          <h1>
            <a href="/" className="text-decoration-none text-dark">
              Cyclemetry
            </a>
            <button type="button" class="btn btn-warning ms-4">
              {/* warn user they will lose current template content if they upload  */}
              Upload Template
            </button>
            <button
              type="button"
              class="btn btn-primary ms-3"
              onClick={downloadTemplate}
            >
              Download Template
            </button>
          </h1>
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
