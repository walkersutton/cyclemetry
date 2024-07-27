import React from "react";
import Button from "react-bootstrap/Button";

function PlaygroundGpxButton({ handleGpxFileStateChange }) {
  const configurePlaygroundGpxFile = (event) => {
    // TODO this logic is bad. fix
    const playgroundGpxFile = new File([], "sweard20.gpx", {
      type: "application/gpx+xml",
    });
    handleGpxFileStateChange(playgroundGpxFile);
  };

  return (
    <Button variant="primary" onClick={configurePlaygroundGpxFile}>
      Use GPX Demo
    </Button>
  );
}

export default PlaygroundGpxButton;
