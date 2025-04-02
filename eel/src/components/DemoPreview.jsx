import ProgressBar from "react-bootstrap/ProgressBar";

function DemoPreview({ generatingImage, imageFilename }) {
  return (
    <>
    {imageFilename &&
      <img
        className="img-fluid bg-dark text-light"
        src={`${imageFilename}`}
        alt="&nbsp;&nbsp;error generating overlay :(&nbsp;&nbsp;"
      />}
      {/* TODO generatingImage value sometimes flips to false before image is shown. why?*/}
    {generatingImage ? (
      <ProgressBar
        striped
        variant="warning"
        now={100}
        label={"building image"}
      />
    ) : null}
    </>
  );
}

export default DemoPreview;
