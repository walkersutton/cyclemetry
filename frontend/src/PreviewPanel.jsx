import React from "react";
import Stack from "react-bootstrap/Stack";

import DemoPreview from "./components/DemoPreview";
import DownloadTemplateButton from "./components/buttons/DownloadTemplateButton";
import PlaygroundGpxButton from "./components/buttons/PlaygroundGpxButton";
import UploadGpxButton from "./components/buttons/UploadGpxButton";
import UploadTemplateButton from "./components/buttons/UploadTemplateButton";

function PreviewPanel({
  editor,
  gpxFilename,
  handleGpxFilenameStateChange,
  imageFilename,
}) {
  return (
    <div className="sticky-top pt-3 me-3 mb-3">
      <DemoPreview imageFilename={imageFilename} />
      {/* use red to indicate user needs to perform some action */}
      {/* // TODO: improve design - communicate to user that these uploads are required before image can be generated */}
      <Stack
        className={
          imageFilename ? "card bg-light p-3 mt-3" : "card bg-light p-3"
        }
        direction="horizontal"
        gap={3}
      >
        <Stack className="card bg-light mx-auto p-3" gap={3}>
          <p>
            <strong>gpxFilename: </strong>
            {gpxFilename ? gpxFilename : "missing gpx activity"}
          </p>

          <UploadGpxButton
            handleGpxFilenameStateChange={handleGpxFilenameStateChange}
          />
          <PlaygroundGpxButton
            handleGpxFilenameStateChange={handleGpxFilenameStateChange}
          />
        </Stack>
        <Stack className="card bg-light mx-auto p-3" gap={3}>
          <DownloadTemplateButton editor={editor} />
          <UploadTemplateButton editor={editor} />
          {/* TODO select random template already configged */}
        </Stack>
      </Stack>
    </div>
  );
}

export default PreviewPanel;
