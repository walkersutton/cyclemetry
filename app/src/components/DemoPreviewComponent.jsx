import React, { useState, useEffect, memo } from "react";
import useStore from "../store/useStore";
import InteractiveOnboarding from "./InteractiveOnboarding";
import ErrorAlert from "./ErrorAlert";
import { Spinner, ProgressBar } from "react-bootstrap";

const DemoPreview = memo(function DemoPreview() {
  const { imageFilename, generatingImage, renderingVideo } = useStore();
  const [renderProgress, setRenderProgress] = useState(null);
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState(null);
  const progressIntervalRef = React.useRef(null);
  const countdownIntervalRef = React.useRef(null);

  // Poll for video rendering progress every 5 seconds
  useEffect(() => {
    if (renderingVideo) {
      // Fetch immediately
      const fetchProgress = async () => {
        try {
          const response = await fetch(
            "http://localhost:3001/api/render-progress",
          );
          if (response.ok) {
            const progress = await response.json();
            setRenderProgress(progress);

            // Update display time with fresh estimate
            if (progress.estimated_seconds_remaining != null) {
              setDisplayTimeRemaining(progress.estimated_seconds_remaining);
            }

            // Stop polling if done
            if (
              progress.status === "cancelled" ||
              progress.status === "complete" ||
              progress.status === "error"
            ) {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
            }
          }
        } catch (err) {
          console.error("Error fetching progress:", err);
        }
      };

      fetchProgress(); // Initial fetch
      progressIntervalRef.current = setInterval(fetchProgress, 5000); // Poll every 5 seconds

      // Countdown timer that decrements every second
      countdownIntervalRef.current = setInterval(() => {
        setDisplayTimeRemaining((prev) => {
          if (prev != null && prev > 0) {
            return prev - 1;
          }
          return prev;
        });
      }, 1000);
    } else {
      // Clear progress when not rendering
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setRenderProgress(null);
      setDisplayTimeRemaining(null);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [renderingVideo]);

  // Show onboarding if no image
  if (!imageFilename) {
    return (
      <div>
        <ErrorAlert />
        <InteractiveOnboarding />
      </div>
    );
  }

  return (
    <div className="position-relative">
      <ErrorAlert />
      {generatingImage && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75"
          style={{ zIndex: 10 }}
        >
          <div className="text-center text-white">
            <Spinner animation="border" variant="light" className="mb-2" />
            <div className="fw-bold">Generating Preview...</div>
          </div>
        </div>
      )}
      {renderingVideo && renderProgress && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75"
          style={{ zIndex: 10 }}
        >
          <div
            className="text-center text-white"
            style={{ width: "80%", maxWidth: "400px" }}
          >
            <Spinner animation="border" variant="light" className="mb-3" />
            <div className="fw-bold mb-2">Rendering Video...</div>
            <div className="bg-dark p-2 rounded">
              <ProgressBar
                variant="success"
                now={(renderProgress.current / renderProgress.total) * 100}
                label={`${Math.round((renderProgress.current / renderProgress.total) * 100)}%`}
                className="mb-2"
                style={{ height: "25px", fontSize: "14px" }}
              />
            </div>
            {displayTimeRemaining != null && (
              <div className="small mt-2">
                {(() => {
                  const totalSeconds = Math.max(0, displayTimeRemaining);
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;

                  if (hours > 0) {
                    return `~${hours}h ${minutes}m ${seconds}s remaining`;
                  } else if (minutes > 0) {
                    return `~${minutes}m ${seconds}s remaining`;
                  } else {
                    return `~${seconds}s remaining`;
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      <img
        className="img-fluid bg-dark text-light"
        src={imageFilename}
        alt="error generating overlay :("
        style={{ minHeight: "400px" }}
      />
    </div>
  );
});

export default DemoPreview;
