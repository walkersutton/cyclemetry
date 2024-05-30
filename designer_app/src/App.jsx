import React, { useState } from "react";

import Editor from "./Editor"; // Import the MyJsonEditor component
import FileUpload from "./FileUpload";
import FlaskServerStatus from "./FlaskServerStatus";
import illyimg from "./test.png";

function App() {
  const [configFileId, setConfigFileId] = useState(null);
  const [gpxFileId, setGpxFileId] = useState(null);
  const [imageFileId, setImageFileId] = useState(null);

  const handleConfigFileIdStateChange = (state) => {
    setConfigFileId(state);
  };
  const handleGpxFileIdStateChange = (state) => {
    setGpxFileId(state);
  };
  const handleImageFileIdStateChange = (state) => {
    setImageFileId(state);
  };

  return (
    <div>
      <div className="container">
        <h1 className="text-center py-4">cyclemetry</h1>

        <FlaskServerStatus />

        {/* {gpxFileId && configFileId && ( */}
        <div className="row">
          <div className="col-3">
            <Editor
              configFileId={configFileId}
              gpxFileId={gpxFileId}
              setFileId={handleImageFileIdStateChange}
            />
            <div className="border border-primary d-flex">
              <FileUpload type="gpx" setFileId={handleGpxFileIdStateChange} />
              <FileUpload
                type="config"
                setFileId={handleConfigFileIdStateChange}
              />
            </div>
          </div>
          <div className="col-9 bg-dark">
            {imageFileId ? (
              <img
                className="img-fluid"
                src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFileId}`}
                alt="generated cyclemetry image"
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
