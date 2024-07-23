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
    <div>
      <div className="container">
        <h1 className="text-center py-4">cyclemetry</h1>
        <FlaskServerStatus />
        <div className="row">
          <div className="col-3">
            <Editor
              configFile={configFile}
              gpxFile={gpxFile}
              setImageFilename={handleImageFileStateChange}
            />
          </div>
          <div className="col-9">
            <PreviewPanel
              gpxFile={gpxFile}
              imageFilename={imageFilename}
              handleGpxFileStateChange={handleGpxFileStateChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
