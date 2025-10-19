import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Alert,
  Dropdown,
  DropdownButton,
  Spinner,
} from "react-bootstrap";
import useStore from "../store/useStore";
import saveFile from "../api/gpxUtils";

const communityTemplateFilenames = [
  "walker_crit_a.json",
  "safa_brian_a_4k_gradient.json",
];

function InteractiveOnboarding() {
  const { gpxFilename, config, imageFilename, generatingImage } = useStore();
  const [completedSteps, setCompletedSteps] = useState({
    step1: false,
    step2: false,
    step3: false,
  });

  // Track completion status
  useEffect(() => {
    setCompletedSteps({
      step1: !!gpxFilename,
      step2: !!config && !!config.scene,
      step3: !!imageFilename,
    });
  }, [gpxFilename, config, imageFilename]);

  const allStepsComplete =
    completedSteps.step1 && completedSteps.step2 && completedSteps.step3;

  const handleLoadDemo = () => {
    const {
      setGpxFilename,
      setDummyDurationSeconds,
      setStartSecond,
      setEndSecond,
      setSelectedSecond,
    } = useStore.getState();

    console.log("🎯 Loading demo GPX from onboarding");
    setGpxFilename("demo.gpxinit");

    const demoDuration = 7946; // seward.gpx duration
    setDummyDurationSeconds(demoDuration);
    setStartSecond(0);
    setEndSecond(demoDuration);
    setSelectedSecond(0);
  };

  const handleLoadTemplate = async (templateFilename) => {
    const { SelectCommunityTemplateFilename } = useStore.getState();

    console.log(
      `🎯 Loading community template from onboarding: ${templateFilename}`,
    );
    await SelectCommunityTemplateFilename(templateFilename);
  };

  return (
    <div className="p-4 bg-light rounded border">
      {allStepsComplete ? (
        <div className="text-center">
          <div className="mb-3">
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-success"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h4 className="text-success mb-3">You're All Set! 🎉</h4>
          <p className="text-muted">You've completed the setup. Now you can:</p>
          <ul
            className="text-start"
            style={{ maxWidth: "400px", margin: "0 auto" }}
          >
            <li>
              Adjust the timeline to select which part of your ride to render
            </li>
            <li>Move the demo position slider to preview different moments</li>
            <li>Customize the overlay in the JSON editor</li>
            <li>Click "Render Video" to create your final overlay video</li>
          </ul>
        </div>
      ) : (
        <>
          <h2 className="h2">🚀 Quick Start</h2>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-start gap-3">
                <div style={{ minWidth: "24px" }}>
                  {completedSteps.step1 && (
                    <span className="text-success fs-5">✓</span>
                  )}
                </div>
                <div className="flex-grow-1">
                  <h6 className={completedSteps.step1 ? "text-success" : ""}>
                    Load an Activity
                  </h6>
                  <p className="small text-muted mb-2">
                    Upload your GPX file or try the demo activity to get
                    started.
                  </p>
                  {!completedSteps.step1 && (
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleLoadDemo}
                      >
                        Try Demo Activity
                      </Button>
                      <label className="btn btn-outline-primary btn-sm mb-0">
                        <input
                          type="file"
                          accept=".gpx"
                          className="d-none"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) saveFile(file);
                          }}
                        />
                        Upload GPX
                      </label>
                    </div>
                  )}
                  {completedSteps.step1 && (
                    <small className="text-success">
                      ✓ Loaded: {gpxFilename}
                    </small>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-start gap-3">
                <div style={{ minWidth: "24px" }}>
                  {completedSteps.step2 && (
                    <span className="text-success fs-5">✓</span>
                  )}
                </div>
                <div className="flex-grow-1">
                  <h6 className={completedSteps.step2 ? "text-success" : ""}>
                    Choose a Template
                  </h6>
                  <p className="small text-muted mb-2">
                    Select a design template for your overlay. This is required
                    to generate a preview.
                  </p>
                  {!completedSteps.step2 && (
                    <>
                      <DropdownButton
                        title="Select a Template"
                        variant="primary"
                        size="sm"
                        className="mb-2"
                      >
                        {communityTemplateFilenames.map(
                          (templateFilename, index) => (
                            <Dropdown.Item
                              onClick={() =>
                                handleLoadTemplate(templateFilename)
                              }
                              key={index}
                            >
                              {templateFilename}
                            </Dropdown.Item>
                          ),
                        )}
                      </DropdownButton>
                    </>
                  )}
                  {completedSteps.step2 && (
                    <small className="text-success">
                      ✓ Template configured
                    </small>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-start gap-3">
                <div style={{ minWidth: "24px" }}>
                  {completedSteps.step3 && (
                    <span className="text-success fs-5">✓</span>
                  )}
                </div>
                <div className="flex-grow-1">
                  <h6
                    className={
                      completedSteps.step3
                        ? "text-success"
                        : generatingImage
                          ? "text-primary"
                          : ""
                    }
                  >
                    Preview Generated
                  </h6>
                  <p className="small text-muted mb-0">
                    Once you have an activity and template, a preview will
                    automatically generate above.
                  </p>
                  {generatingImage && (
                    <div className="d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" variant="primary" />
                      <small className="text-primary fw-bold">
                        Generating preview...
                      </small>
                    </div>
                  )}
                  {!generatingImage && completedSteps.step3 && (
                    <small className="text-success">
                      ✓ Preview ready! Check it out above.
                    </small>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}

export default InteractiveOnboarding;
