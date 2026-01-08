import React, { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";

const STARTUP_GRACE_PERIOD_MS = 20000; // 20 seconds for backend to start

function BackendStatus() {
  const [isConnected, setIsConnected] = useState(null); // null = checking, true = connected, false = disconnected
  const [lastCheck, setLastCheck] = useState(null);
  const [sidecarDebug, setSidecarDebug] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      // Capture sidecar debug state
      if (window.__SIDECAR_DEBUG__) {
        setSidecarDebug({ ...window.__SIDECAR_DEBUG__ });
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch("http://localhost:3001/api/health", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setIsConnected(data.status === "ok");
        } else {
          setIsConnected(false);
        }
        setLastCheck(new Date());
      } catch {
        setIsConnected(false);
        setLastCheck(new Date());
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 3000);
    return () => clearInterval(interval);
  }, []);

  const isTauri = typeof window.__TAURI__ !== "undefined";
  const startupTime = sidecarDebug?.startTime
    ? Date.now() - sidecarDebug.startTime
    : 0;
  const isStartingUp = startupTime < STARTUP_GRACE_PERIOD_MS;

  // Show loading state during startup in Tauri
  if (isConnected === null || (isConnected === false && isStartingUp && isTauri)) {
    return (
      <Alert variant="info" className="m-2 d-flex align-items-center">
        <Spinner animation="border" size="sm" className="me-2" />
        <div>
          <strong>Starting backend server...</strong>
          <span className="ms-2 text-muted small">
            ({Math.round(startupTime / 1000)}s)
          </span>
        </div>
      </Alert>
    );
  }

  // Show error state if not connected after grace period
  if (!isConnected) {
    return (
      <Alert variant="danger" className="m-2">
        <Alert.Heading className="h6">
          ⚠️ Backend Server Not Running
        </Alert.Heading>

        {sidecarDebug && (
          <div className="mb-3 p-2 bg-dark text-light rounded small">
            <div><strong>Status:</strong> {sidecarDebug.status}</div>
            {sidecarDebug.pid && <div><strong>PID:</strong> {sidecarDebug.pid}</div>}
            {sidecarDebug.error && (
              <div className="text-warning mt-1">
                <strong>Error:</strong> {sidecarDebug.error}
              </div>
            )}
          </div>
        )}

        {sidecarDebug?.logs?.length > 0 && (
          <div className="mb-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? "Hide" : "Show"} Logs ({sidecarDebug.logs.length})
            </button>
            {showLogs && (
              <pre className="mt-2 p-2 bg-dark text-light rounded" style={{ maxHeight: "150px", overflow: "auto", fontSize: "10px" }}>
                {sidecarDebug.logs.join("\n")}
              </pre>
            )}
          </div>
        )}

        {!isTauri && (
          <div className="mb-2 small">
            <strong>Browser mode.</strong> Start backend:
            <code className="d-block bg-dark text-light p-1 rounded mt-1">make dev</code>
          </div>
        )}

        <small className="text-muted">
          Last check: {lastCheck?.toLocaleTimeString() || "Never"}
        </small>
      </Alert>
    );
  }

  return null;
}

export default BackendStatus;
