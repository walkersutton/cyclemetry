import useStore from "../store/useStore";
import InteractiveOnboarding from "./InteractiveOnboarding";

function DemoPreview() {
  const { imageFilename } = useStore();

  // Show onboarding if no image
  if (!imageFilename) {
    return <InteractiveOnboarding />;
  }

  return (
    <img
      className="img-fluid bg-dark text-light"
      src={`${imageFilename}`}
      alt="&nbsp;&nbsp;error generating overlay :(&nbsp;&nbsp;"
    />
  );
}

export default DemoPreview;
