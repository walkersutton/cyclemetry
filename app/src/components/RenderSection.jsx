import React, { useState } from "react";
import useStore from "../store/useStore";
import ProgressBar from "react-bootstrap/ProgressBar";
import TimelineControls from "./TimelineControls";
import ResetButton from "./ResetButton";
import renderVideo from "../api/renderVideo";
import generateDemoFrame from "../api/generateDemoFrame";

function RenderSection() {
  const {
    generatingImage,
    renderingVideo,
    startSecond,
    endSecond,
    config,
    setConfig,
  } = useStore();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [renderProgress, setRenderProgress] = useState(null);
  const progressIntervalRef = React.useRef(null);

  // Get current scene settings from config
  const fps = config?.scene?.fps || 30;
  const width = config?.scene?.width || 3840;
  const height = config?.scene?.height || 2160;

  const updateSceneSetting = (key, value) => {
    if (!config) return;
    const newConfig = {
      ...config,
      scene: {
        ...config.scene,
        [key]: value,
      },
    };
    setConfig(newConfig);
  };

  const handleCancelRender = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/cancel-render", {
        method: "POST",
      });
      if (response.ok) {
        console.log("Cancellation requested");
      }
    } catch (err) {
      console.error("Error cancelling render:", err);
    }
  };

  const handleRenderVideo = async () => {
    setError(null);
    setSuccess(null);
    setRenderProgress(null);

    // Note: Progress polling is handled by DemoPreviewComponent
    // No need to poll here to avoid duplicate requests

    try {
      const result = await renderVideo();
      setSuccess(`Video rendered successfully: ${result.filename}`);
      setRenderProgress(null);
    } catch (err) {
      const errorMsg = err.message || "Failed to render video";
      if (errorMsg.includes("cancelled")) {
        setError("Rendering cancelled");
      } else {
        setError(errorMsg);
      }
      console.error("Video rendering error:", err);
      setRenderProgress(null);
    }
  };

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="col-auto">
      <div className="card bg-light w-auto">
        <div className="card-body">
          <h6 className="card-title">Render Settings</h6>
          <div className="mt-3">
            {error && (
              <div className="alert alert-danger mt-2 small">{error}</div>
            )}
            {success && (
              <div className="alert alert-success mt-2 small">{success}</div>
            )}
          </div>

          {/* Timeline controls */}
          <TimelineControls />

          {/* Video settings */}
          {config && (
            <div className="mt-3">
              <div className="row g-2">
                <div className="col-4">
                  <label className="form-label small mb-1">FPS</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={fps}
                    onChange={(e) =>
                      updateSceneSetting("fps", parseInt(e.target.value) || 30)
                    }
                    min={1}
                    max={60}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small mb-1">Width</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={width}
                    onChange={(e) =>
                      updateSceneSetting(
                        "width",
                        parseInt(e.target.value) || 3840,
                      )
                    }
                    min={640}
                    step={1}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small mb-1">Height</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={height}
                    onChange={(e) =>
                      updateSceneSetting(
                        "height",
                        parseInt(e.target.value) || 2160,
                      )
                    }
                    min={480}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="d-flex flex-column gap-2 mt-3">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => generateDemoFrame()}
              disabled={generatingImage}
            >
              {generatingImage ? "Rendering..." : "Render Preview Image"}
            </button>

            {!renderingVideo ? (
              <button
                className="btn btn-primary"
                onClick={handleRenderVideo}
                disabled={generatingImage}
              >
                Render Video
              </button>
            ) : (
              <button className="btn btn-danger" onClick={handleCancelRender}>
                Cancel Rendering
              </button>
            )}

            <ResetButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RenderSection;
