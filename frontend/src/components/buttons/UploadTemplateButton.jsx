import React from "react";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

function UploadTemplateButton({ editor }) {
  const templateSchema = {
    allowedType: "application/json",
    extension: ".json",
    inputId: "file-upload-template",
  };
  const uploadTemplate = (event) => {
    const f = event.target.files[0];
    if (f && f.type === templateSchema.allowedType) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const fileContent = e.target.result;
        try {
          const jsonContent = JSON.parse(fileContent);
          editor.setValue(jsonContent);
          // setConfigFile(f);
          // having an issue where sometimes, before gpx file is set, template editor doesn't update values with uploaded tempalte values
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      reader.onerror = function (e) {
        console.error("Error reading file:", e.target.error);
      };
      reader.readAsText(f);
    } else {
      console.log("oh shit.");
    }
  };
  return (
    <>
      <input
        accept={templateSchema.extension}
        type="file"
        id={templateSchema.inputId}
        className="file-input"
        onChange={uploadTemplate}
      />
      <OverlayTrigger
        overlay={
          <Tooltip id="tooltip-top">
            WARNING: Uploading a template will overwrite your existing
            configuration
          </Tooltip>
        }
        placement={"top"}
      >
        <label
          htmlFor={templateSchema.inputId}
          className="btn btn-warning ms-4"
        >
          Upload Template
        </label>
      </OverlayTrigger>
    </>
  );
}

export default UploadTemplateButton;
