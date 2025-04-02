import React, { useState } from "react";

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

  const [communityTemplateFilename, setCommunityTemplateFilename] = useState(null);
  const [loadedTemplateFilename, setLoadedTemplateFilename] = useState(null);

  const handleCommunityTemplateFilenameStateChange = (state) => {
    setLoadedTemplateFilename(null);
    setCommunityTemplateFilename(state);
    if (state) {
      const url = 'templates/' + state
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            console.log(
              "SelectCommunityTemplateButton:useEffect(): network response was badddd"
            );
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          editor.setValue(data);
        })
        .catch((error) => {
          console.log("error with community templates");
          console.log("error")
        });
    }
  };

  const handleLoadedTemplateFilenameStateChange = (state) => {
    setCommunityTemplateFilename(null);
    setLoadedTemplateFilename(state);
  }

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
              gpxFilename={gpxFilename}
              handleGpxFilenameStateChange={handleGpxFilenameStateChange}
            />
            <UploadTemplateButton editor={editor} loadedTemplateFilename={loadedTemplateFilename} handleLoadedTemplateFilenameStateChange={handleLoadedTemplateFilenameStateChange}/>
            <SelectCommunityTemplateButton communityTemplateFilename={communityTemplateFilename} handleCommunityTemplateFilenameStateChange={handleCommunityTemplateFilenameStateChange}/>
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
