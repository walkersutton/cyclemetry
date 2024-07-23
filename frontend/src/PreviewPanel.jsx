import React from "react";
import FileUpload from "./FileUpload";

function PreviewPanel({
  gpxFile,
  handleGpxFileStateChange,
  imageFilename,
}) {
  return imageFilename ? (
    // TODO: this image needs to stay on the screen as user scrolls down to modify other template config. figure that out
    <img
      className="img-fluid"
      src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFilename}`}
      alt="generated overlay"
    />
  ) : (
    // TODO: improve design - communicate to user that these uploads are required before image can be generated
    <div>
      <FileUpload
        type="gpx"
        file={gpxFile}
        setFile={handleGpxFileStateChange}
      />
    </div>
  );
}

export default PreviewPanel;
