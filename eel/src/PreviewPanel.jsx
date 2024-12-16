import React from "react";

import DemoPreview from "./components/DemoPreview";
import DownloadTemplateButton from "./components/buttons/DownloadTemplateButton";
import UploadGpxButton from "./components/buttons/UploadGpxButton";
import UploadTemplateButton from "./components/buttons/UploadTemplateButton";
import SelectCommunityTemplateButton from "./components/buttons/SelectCommunityTemplateButton";

function PreviewPanel({
  editor,
  generatingImage,
  handleGpxFilenameStateChange,
  imageFilename,
}) {
  return (
    <div className="stuckk pe-2">
      <DemoPreview
        generatingImage={generatingImage}
        imageFilename={imageFilename}
      />
      <div className="card bg-light mt-2 p-2">
        <div className="row">
          <div className="d-flex flex-wrap">
            <UploadGpxButton
              handleGpxFilenameStateChange={handleGpxFilenameStateChange}
            />
            <UploadTemplateButton editor={editor} />
            <SelectCommunityTemplateButton editor={editor} />
            <DownloadTemplateButton editor={editor} />
          </div>
        </div>
      </div>
      <div className="p-2">
        <p>
          <a href="https://github.com/walkersutton/cyclemetry/blob/main/templates/README.md">
            Template Schema
          </a>
          <br />
          <a href="https://github.com/walkersutton/cyclemetry">GitHub repo</a>
        </p>
      </div>
    </div>
  );
}

export default PreviewPanel;
