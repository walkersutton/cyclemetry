import React from "react";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

const templateSchema = {
  allowedType: "application/json",
  extension: ".json",
  inputId: "file-upload-template",
};

function UploadTemplateButton({ editor }) {
  const handleFileChange = (event) => {
    const f = event.target.files[0];
    if (f && f.type === templateSchema.allowedType) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const fileContent = e.target.result;
        try {
          const jsonContent = JSON.parse(fileContent);
          // do i need to setvalue to empty first?
          editor.setValue(jsonContent);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert(error);
        }
      };
      reader.onerror = function (e) {
        console.error("Error reading file:", e.target.error);
      };
      reader.readAsText(f);
    } else {
      console.log(f);
      console.log("oh shit.");
    }
    event.target.value = null;
  };
  return (
    <>
      <input
        accept={templateSchema.extension}
        type="file"
        id={templateSchema.inputId}
        className="file-input"
        onChange={handleFileChange}
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
        <label htmlFor={templateSchema.inputId} className="btn btn-warning m-1">
          Upload Template
        </label>
      </OverlayTrigger>
    </>
  );
}

export default UploadTemplateButton;
