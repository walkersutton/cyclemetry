import React from "react";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

const templateSchema = {
  allowedType: "application/json",
  extension: ".json",
  inputId: "file-load-template",
};
import useStore from "../../store/useStore";

function LoadTemplateButton() {
  const { editor, loadedTemplateFilename, setLoadedTemplateFilename } =
    useStore();
  const handleFileChange = (event) => {
    const f = event.target.files[0];
    if (f && f.type === templateSchema.allowedType) {
      setLoadedTemplateFilename(f.name);
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
            WARNING: Loading a template will overwrite your existing
            configuration
          </Tooltip>
        }
        placement={"top"}
      >
        {loadedTemplateFilename ? (
          <label
            htmlFor={templateSchema.inputId}
            className="btn btn-success m-1"
          >
            {loadedTemplateFilename}
          </label>
        ) : (
          <label
            htmlFor={templateSchema.inputId}
            className="btn btn-primary m-1"
          >
            Upload Template
          </label>
        )}
      </OverlayTrigger>
    </>
  );
}

export default LoadTemplateButton;
