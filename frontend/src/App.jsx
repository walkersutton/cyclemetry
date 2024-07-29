import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";

import Editor from "./Editor";
import PreviewPanel from "./PreviewPanel";
import FlaskServerStatus from "./FlaskServerStatus";
import logo from "./logo.webp";

function App() {
  const [gpxFilename, setGpxFilename] = useState(".demo.gpx");
  const [imageFilename, setImageFilename] = useState(null);
  const [editor, setEditor] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const handleGpxFilenameStateChange = (state) => {
    setGpxFilename(state);
  };
  const handleImageFilenameStateChange = (state) => {
    setImageFilename(state);
  };
  const handleEditorStateChange = (state) => {
    setEditor(state);
  };
  const handleGeneratingImageStateChange = (state) => {
    setGeneratingImage(state);
  };

  return (
    <>
      <main>
        <div className="d-flex flex-column ps-3 pt-3 me-3 mb-3">
          <div className="card bg-light p-3 mb-3">
            {/* TODO this link covers lots of empty space on card. fix this */}
            <a href="/" className="text-decoration-none text-dark">
              <img src={logo} alt="Cyclemetry logo" className="logo" />
              <strong>cyclemetry</strong>
            </a>
          </div>
          <Editor
            gpxFilename={gpxFilename}
            handleEditorStateChange={handleEditorStateChange}
            handleGeneratingImageStateChange={handleGeneratingImageStateChange}
            handleImageFilenameStateChange={handleImageFilenameStateChange}
          />
          <p className="text-center">
            <a href="https://github.com/walkersutton/cyclemetry">GitHub</a>
          </p>
        </div>
        <div>
          <PreviewPanel
            editor={editor}
            generatingImage={generatingImage}
            gpxFilename={gpxFilename}
            handleGpxFilenameStateChange={handleGpxFilenameStateChange}
            imageFilename={imageFilename}
          />
        </div>
      </main>
    </>
  );
}

export default App;
