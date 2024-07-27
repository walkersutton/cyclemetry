import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";

import Editor from "./Editor";
import PreviewPanel from "./PreviewPanel";
import FlaskServerStatus from "./FlaskServerStatus";
import logo from "./logo.webp";

function App() {
  const [gpxFile, setGpxFile] = useState(null);
  const [imageFilename, setImageFilename] = useState(null);
  const [editor, setEditor] = useState(null);

  const handleGpxFileStateChange = (state) => {
    setGpxFile(state);
  };
  const handleImageFileStateChange = (state) => {
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
            <a href="/" className="text-decoration-none text-dark">
              <img src={logo} alt="Cyclemetry logo" className="logo" />
              <strong>cyclemetry</strong>
            </a>
            {/* TODO maybe put gpx filename and template filename as statuses here to show what they're currently modifying */}
          </div>
          <Editor
            gpxFile={gpxFile}
            setImageFilename={handleImageFileStateChange}
            setEditor={handleEditorStateChange}
          />
        </div>
        <div id="currently-need-this-div-for-sticky-top-to-work">
          <PreviewPanel
            gpxFile={gpxFile}
            imageFilename={imageFilename}
            handleGpxFileStateChange={handleGpxFileStateChange}
            editor={editor}
          />
        </div>
      </main>
    </>
  );
}

export default App;
