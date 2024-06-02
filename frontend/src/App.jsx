import React, { useState } from "react";

import Editor from "./Editor"; // Import the MyJsonEditor component
import FileUpload from "./FileUpload";
import FlaskServerStatus from "./FlaskServerStatus";
import illyimg from "./test.png";

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

        {/* {gpxFile && configFile && ( */}
        <div className="row">
          <div className="col-3">
            <Editor
              configFile={configFile}
              gpxFile={gpxFile}
              setImageFilename={handleImageFileStateChange}
            />
            <div className="border border-primary d-flex">
              <FileUpload
                type="gpx"
                file={gpxFile}
                setFile={handleGpxFileStateChange}
              />
              <FileUpload
                type="config"
                file={configFile}
                setFile={handleConfigFileStateChange}
              />
            </div>
          </div>
          <div className="col-9 bg-dark">
            {imageFilename ? (
              <img
                className="img-fluid"
                src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFilename}`}
                alt="generated overlay"
              />
            ) : (
              <img src={illyimg} alt="demo frame heyooo" />
            )}
          </div>
        </div>
        {/* )} */}
      </div>
    </div>
  );
}

export default App;
