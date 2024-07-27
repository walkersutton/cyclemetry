import React from "react";
import FileUpload from "./FileUpload";

function UploadTemplateButton({ editor }) {
  const templateSchema = {
    allowedType: "application/json",
    extension: ".json",
    inputId: "file-upload-template",
  };
  const uploadTemplate = (event) => {
    // TODO make this a tooltip with react-bootstrap
    // alert(
    //   "uploading a template will overwrite your existing template configuration"
    // );
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
      <label htmlFor={templateSchema.inputId} className="btn btn-warning ms-4">
        Upload Template
      </label>
    </>
  );
}

function DownloadTemplateButton({ editor }) {
  const downloadTemplate = () => {
    const jsonString = JSON.stringify(editor.getValue(), null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyclemetry_template.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      className="btn btn-primary ms-3"
      onClick={downloadTemplate}
    >
      Download Template
    </button>
  );
}

function PreviewPanel({
  gpxFile,
  handleGpxFileStateChange,
  imageFilename,
  editor,
}) {
  return (
    // TODO: this image needs to stay on the screen as user scrolls down to modify other template config. figure that out
    <div className="sticky-top pt-4 px-4">
      {imageFilename ? (
        <img
          className="img-fluid pt-4 bg-dark"
          // className="img-fluid sticky-top pt-4 bg-dark"
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
        <button type="button" className="btn btn-primary">
          gpx: upload file
        </button>
        <UploadTemplateButton editor={editor} />
        <DownloadTemplateButton editor={editor} />
      </div>
      <p>buttons that should alweayd ey wlaker</p>
    </div>
  );
}

export default PreviewPanel;

{
  /* // TODO: improve design - communicate to user that these uploads are required before image can be generated */
}
