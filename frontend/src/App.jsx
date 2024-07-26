import React, { useState } from "react";

import Editor from "./Editor"; // Import the MyJsonEditor component
import PreviewPanel from "./PreviewPanel";
import FlaskServerStatus from "./FlaskServerStatus";

function App() {
  const [configFile, setConfigFile] = useState(null);
  const [gpxFile, setGpxFile] = useState(null);
  const [imageFilename, setImageFilename] = useState(null);

  const handleConfigFileStateChange = (state) => {
    setConfigFile(state);
  };
  const handleGpxFileStateChange = (state) => {
    setGpxFile(state);
  };
  const handleImageFileStateChange = (state) => {
    setImageFilename(state);
  };

  return (
    <>
      <FlaskServerStatus />
      <main>
        <div class="d-flex flex-column p-3" style={{ width: "200px;" }}>
          <h1>Cyclemetry</h1>
          <Editor
            configFile={configFile}
            gpxFile={gpxFile}
            setImageFilename={handleImageFileStateChange}
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
