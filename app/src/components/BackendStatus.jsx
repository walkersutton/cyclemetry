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
          console.log("Backend check:", connected ? "✓ connected" : "✗ disconnected");
          setIsConnected(connected);
        } else {
          console.log("Backend check: ✗ disconnected (status:", response.status, ")");
          setIsConnected(false);
        }
        setLastCheck(new Date());
      } catch (error) {
        console.log("Backend check: ✗ disconnected (error:", error.message, ")");
        setIsConnected(false);
        setLastCheck(new Date());
      }
    };

    // Check immediately on mount
    checkBackend();

    // Check every 10 seconds
    const interval = setInterval(checkBackend, 10000);

    return () => clearInterval(interval);
  }, []);

  // Only show alert if disconnected
  if (!isConnected && isConnected !== null) {
    return (
      <Alert variant="danger" className="m-2">
        <Alert.Heading className="h6">⚠️ Backend Server Not Running</Alert.Heading>
        <p className="mb-2">
          Cannot connect to Flask server at <code>http://localhost:3001</code>
        </p>
        <hr />
        <p className="mb-0 small">
          <strong>To start the backend:</strong>
          <br />
          <code>cd backend && python app.py</code>
          <br />
          <span className="text-muted">
            Last checked: {lastCheck?.toLocaleTimeString()}
          </span>
        </p>
      </Alert>
    );
  }

  // Don't show anything if connected or still checking
  return null;
}

export default BackendStatus;
