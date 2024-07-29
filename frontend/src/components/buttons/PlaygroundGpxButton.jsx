import React from "react";
import Button from "react-bootstrap/Button";

function PlaygroundGpxButton({ handleGpxFilenameStateChange }) {
  const configurePlaygroundGpxFile = (event) => {
    // TODO this logic is bad. fix
    // because it assumes this file exists already, amongst other reasons
    const playgroundGpxFilename = "sweard20.gpx";
    handleGpxFilenameStateChange(playgroundGpxFilename);
  };

  return (
    <Button variant="primary" onClick={configurePlaygroundGpxFile}>
      GPX Demo
    </Button>
  );
}

export default PlaygroundGpxButton;
