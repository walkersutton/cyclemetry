function DemoPreview({ imageFilename }) {
  // TODO add a loading new image spinner bar thingy
  if (imageFilename) {
    return (
      <img
        className="img-fluid bg-dark text-light"
        src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFilename}`}
        alt="&nbsp;&nbsp;error generating overlay :(&nbsp;&nbsp;"
      />
    );
  } else return null;
}

export default DemoPreview;
