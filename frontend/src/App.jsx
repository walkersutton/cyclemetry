import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import { Panel, PanelResizeHandle, PanelGroup } from "react-resizable-panels";

import Editor from "./Editor";
import PreviewPanel from "./PreviewPanel";

function App() {
  const [gpxFilename, setGpxFilename] = useState(".demo.gpx");
  const [imageFilename, setImageFilename] = useState(".demo.png");
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
      <PanelGroup
        autoSaveId="persistence"
        direction="horizontal"
        className="p-2"
      >
        <Panel className="pe-1" minSize={15} defaultSize={30}>
          <div className="p-2 mb-2" style={{ overflow: "auto" }}>
            <a href="/" className="text-decoration-none text-dark">
              <img
                src="/cyclemetry/logo192.png"
                alt="Cyclemetry logo"
                className="logo"
              />
              <strong>cyclemetry</strong>
            </a>
          </div>
          <Editor
            gpxFilename={gpxFilename}
            handleEditorStateChange={handleEditorStateChange}
            handleGeneratingImageStateChange={handleGeneratingImageStateChange}
            handleImageFilenameStateChange={handleImageFilenameStateChange}
          />
        </Panel>
        <PanelResizeHandle />
        <Panel className="ps-1" minSize={30}>
          <PreviewPanel
            editor={editor}
            generatingImage={generatingImage}
            handleGpxFilenameStateChange={handleGpxFilenameStateChange}
            imageFilename={imageFilename}
          />
        </Panel>
      </PanelGroup>
    </>
  );
}

export default App;
