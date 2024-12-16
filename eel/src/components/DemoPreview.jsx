import ProgressBar from "react-bootstrap/ProgressBar";

function DemoPreview({ generatingImage, imageFilename }) {
  return (
    <>
      <img
        className="img-fluid bg-dark text-light"
        src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFilename}`}
        alt="&nbsp;&nbsp;error generating overlay :(&nbsp;&nbsp;"
      />
      {generatingImage ? (
        <ProgressBar
          striped
          variant="warning"
          now={100}
          label={"generating image"}
        />
      ) : null}
    </>
  );
}

export default DemoPreview;
