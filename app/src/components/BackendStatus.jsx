import React, { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";

function BackendStatus() {
  const [isConnected, setIsConnected] = useState(null); // null = checking, true = connected, false = disconnected
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        // Use the health check endpoint
        const response = await fetch("http://localhost:3001/api/health", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const connected = data.status === "ok";
          console.log(
            "Backend check:",
            connected ? "✓ connected" : "✗ disconnected",
          );
          setIsConnected(connected);
        } else {
          console.log(
            "Backend check: ✗ disconnected (status:",
            response.status,
            ")",
          );
          setIsConnected(false);
        }
        setLastCheck(new Date());
      } catch (error) {
        console.log(
          "Backend check: ✗ disconnected (error:",
          error.message,
          ")",
        );
        setIsConnected(false);
        setLastCheck(new Date());
      }
    };

    // Check immediately on mount
    checkBackend();

    // Check every 30 seconds (reduced from 10s to minimize network requests)
    const interval = setInterval(checkBackend, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isConnected && isConnected !== null) {
    return (
      <Alert variant="danger" className="m-2">
        <Alert.Heading className="h6">
          ⚠️ Backend Server Not Running
        </Alert.Heading>
        <p className="mb-2">
          The backend server is not responding. This usually happens when:
        </p>
        <ul className="mb-2 small">
          <li>The server crashed due to invalid configuration</li>
          <li>Docker containers were stopped</li>
          <li>Network connection issues</li>
        </ul>
        <p className="mb-2">
          <strong>To restart:</strong>
        </p>
        <code className="d-block bg-dark text-light p-2 rounded mb-2">
          make clean && make dev
        </code>
        <small className="text-muted">
          Last checked: {lastCheck?.toLocaleTimeString() || "Never"}
        </small>
      </Alert>
    );
  }

  // Don't show anything if connected or still checking
  return null;
}

export default BackendStatus;
