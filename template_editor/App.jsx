import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { Panel, PanelResizeHandle, PanelGroup } from "react-resizable-panels";

import Editor from "./Editor2??";
import PreviewPanel from "./PreviewPanel";

// import { eel } from "./eel.js";

export const eel = window.eel;
// eel.set_host( 'ws://localhost:8080' )
// import { eel } from "../public/eel.js";
// import { eel } from "./eel.js";

// export const eel = window.eel
eel.set_host("http://localhost:8000");
// eel.set_host( 'ws://localhost:8000' )
// eel.hello();

export const initGpxFilename = "demo.gpxinit";

function App() {
  const [gpxFilename, setGpxFilename] = useState(initGpxFilename);
  const [gpxFilestring, setGpxFilestring] = useState(null);
  const [imageFilename, setImageFilename] = useState(null);
  const [editor, setEditor] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        console.log("fetchFile called");
        const response = await fetch(gpxFilename); // Path to your file in the public folder
        const fileBlob = await response.blob(); // Convert the response to a Blob

        const reader = new FileReader();
        reader.onloadend = () => {
          // Assign the base64 string to the state variable
          const vall = reader.result.split(",")[1]; // Remove the data URL prefix
          // setgpxFilestring(vall);
          handleGpxFilestringStateChange(vall);
          // handleGpxFilestringStateChange(vall);
          // setGpxFilename("heyyyyyy.gpx");
        };

        reader.readAsDataURL(fileBlob); // Convert the Blob to Base64 string
      } catch (error) {
        console.error("Error fetching file:", error);
      }
    };
    fetchFile();
  }, [gpxFilename]);

  const handleGpxFilenameStateChange = (state) => {
    setGpxFilename(state);
  };
  const handleGpxFilestringStateChange = (state) => {
    setGpxFilestring(state);
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
  // eel.set_host("ws://localhost:8888");
  // eel.hello("what is good mate");
  // export const eel = window.eel;
  // eel.hello();

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
              <img src="/logo192.png" alt="Cyclemetry logo" className="logo" />
              <strong>cyclemetry</strong>
            </a>
          </div>
          <Editor
            gpxFilename={gpxFilename}
            gpxFilestring={gpxFilestring}
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
            gpxFilename={gpxFilename}
            handleGpxFilenameStateChange={handleGpxFilenameStateChange}
            imageFilename={imageFilename}
          />
        </Panel>
      </PanelGroup>
    </>
  );
}

export default App;
