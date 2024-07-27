function DemoPreview({ imageFilename }) {
    // TODO add a loading new image spinner bar thingy
  if (imageFilename) {
    return (
      <img
        className="img-fluid pt-4 bg-dark"
        src={`${process.env.REACT_APP_FLASK_SERVER_URL}/images/${imageFilename}`}
        alt="generated overlay"
      />
    );
  } else return null;
}

export default DemoPreview;
