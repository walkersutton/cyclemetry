import React from "react";
import FileUpload from "./FileUpload";

import UploadTemplateButton from "./components/buttons/UploadTemplateButton";
import DownloadTemplateButton from "./components/buttons/DownloadTemplateButton";

function PreviewPanel({
  gpxFile,
  handleGpxFileStateChange,
  imageFilename,
  editor,
}) {
  return (
    <div className="sticky-top pt-4 px-4">
      {imageFilename ? (
        <img
          className="img-fluid pt-4 bg-dark"
          src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFilename}`}
          alt="generated overlay"
        />
      ) : (
        // gpx upload
        <FileUpload
          type="gpx"
          file={gpxFile}
          setFile={handleGpxFileStateChange}
        />
      )}
      <div>
        {/* use red to indicate user needs to perform some action */}
        {/* // TODO: improve design - communicate to user that these uploads are required before image can be generated */}
        {/* <Button variant="primary">gpx: upload file</Button> */}

        <UploadTemplateButton editor={editor} />
        <DownloadTemplateButton editor={editor} />
      </div>
      <p>buttons that should alweayd ey wlaker</p>
    </div>
  );
}

export default PreviewPanel;
