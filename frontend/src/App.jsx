import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";

import Editor from "./Editor";
import PreviewPanel from "./PreviewPanel";
import FlaskServerStatus from "./FlaskServerStatus";
import logo from "./logo.webp";

function App() {
  const [gpxFilename, setGpxFilename] = useState(null);
  const [imageFilename, setImageFilename] = useState(null);
  const [editor, setEditor] = useState(null);

  const handleGpxFilenameStateChange = (state) => {
    setGpxFilename(state);
  };
  const handleImageFilenameStateChange = (state) => {
    setImageFilename(state);
  };
  const handleEditorStateChange = (state) => {
    setEditor(state);
  };

  return (
    <>
      <FlaskServerStatus />
      <main className="p-3">
        <div className="d-flex flex-column">
          <div className="card bg-light p-3 mb-3">
            <a href="/" className="col text-decoration-none text-dark">
              <img src={logo} alt="Cyclemetry logo" className="logo" />
              <strong>cyclemetry</strong>
            </a>
          </div>
          <Editor
            gpxFilename={gpxFilename}
            handleEditorStateChange={handleEditorStateChange}
            handleImageFilenameStateChange={handleImageFilenameStateChange}
          />
        </div>
        <div id="todo-fix-styling-currently-need-this-div-for-sticky-top-to-work">
          <PreviewPanel
            editor={editor}
            gpxFilename={gpxFilename}
            handleGpxFilenameStateChange={handleGpxFilenameStateChange}
            imageFilename={imageFilename}
          />
        </div>
        {/* TODO add link to repo */}
      </main>
    </>
  );
}

export default App;
