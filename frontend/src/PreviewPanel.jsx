import React from "react";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";

import DemoPreview from "./components/DemoPreview";
import DownloadTemplateButton from "./components/buttons/DownloadTemplateButton";
import UploadGpxButton from "./components/buttons/UploadGpxButton";
import UploadTemplateButton from "./components/buttons/UploadTemplateButton";
import SelectCommunityTemplateButton from "./components/buttons/SelectCommunityTemplateButton";

function PreviewPanel({
  editor,
  generatingImage,
  gpxFilename,
  handleGpxFilenameStateChange,
  imageFilename,
}) {
  return (
    <div className="sticky-top pt-3 me-3 mb-3">
      <DemoPreview
        generatingImage={generatingImage}
        imageFilename={imageFilename}
      />
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
        </Stack>
        <Stack className="card bg-light mx-auto p-3" gap={3}>
          <Stack direction="horizontal" gap={2}>
            <Button
              variant="info"
              href="https://github.com/walkersutton/cyclemetry/blob/main/templates/README.md"
            >
              Template Schema
            </Button>
            <DownloadTemplateButton editor={editor} />
          </Stack>
          <Stack direction="horizontal" gap={2}>
            <UploadTemplateButton editor={editor} />
            <SelectCommunityTemplateButton editor={editor} />
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
}

export default PreviewPanel;
