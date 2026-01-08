import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import { Panel, PanelResizeHandle, PanelGroup } from "react-resizable-panels";
import Editor from "./Editor";
import PreviewPanel from "./PreviewPanel";
import TemplatesSection from "./components/TemplatesSection";
import useStore from "./store/useStore";
import "jsoneditor-react/es/editor.min.css";

import { Command } from "@tauri-apps/plugin-shell";

// Global state for sidecar debugging (accessible from BackendStatus)
window.__SIDECAR_DEBUG__ = {
  status: "initializing",
  error: null,
  pid: null,
  logs: [],
  startTime: null,
};

const logSidecar = (message) => {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}`;
  console.log(`[Sidecar] ${message}`);
  window.__SIDECAR_DEBUG__.logs.push(entry);
  // Keep only last 50 log entries
  if (window.__SIDECAR_DEBUG__.logs.length > 50) {
    window.__SIDECAR_DEBUG__.logs.shift();
  }
};

function App() {
  useEffect(() => {
    const spawnBackend = async () => {
      window.__SIDECAR_DEBUG__.startTime = Date.now();
      
      // Check if running in Tauri context
      if (typeof window.__TAURI__ === "undefined") {
        logSidecar("Not running in Tauri context, skipping sidecar spawn");
        window.__SIDECAR_DEBUG__.status = "not_tauri";
        return;
      }

      // First, check if backend is already running (from previous instance)
      logSidecar("Checking if backend is already running...");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch("http://localhost:3001/api/health", {
          method: "GET",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === "ok") {
            logSidecar("Backend already running, skipping spawn");
            window.__SIDECAR_DEBUG__.status = "already_running";
            return;
          }
        }
      } catch (e) {
        // Backend not running, proceed to spawn
        logSidecar("Backend not running, will spawn new instance");
      }

      logSidecar("Tauri context detected, attempting to spawn sidecar...");
      window.__SIDECAR_DEBUG__.status = "spawning";

      try {
        logSidecar("Creating sidecar command for: binaries/cyclemetry-server");
        const command = Command.sidecar("binaries/cyclemetry-server");

        // Listen for stdout/stderr with enhanced logging
        command.stdout.on("data", (line) => {
          logSidecar(`[stdout] ${line}`);
        });
        
        command.stderr.on("data", (line) => {
          logSidecar(`[stderr] ${line}`);
          // Check for port conflict error
          if (line.includes("Address already in use") || line.includes("Port 3001 is in use")) {
            logSidecar("Port conflict detected - backend may already be running");
            window.__SIDECAR_DEBUG__.status = "port_conflict";
          }
        });
        
        command.on("close", (data) => {
          logSidecar(`Process exited with code ${data.code}`);
          window.__SIDECAR_DEBUG__.status = `exited_${data.code}`;
          window.__SIDECAR_DEBUG__.childProcess = null;
          if (data.code !== 0) {
            window.__SIDECAR_DEBUG__.error = `Process exited with code ${data.code}`;
          }
        });
        
        command.on("error", (error) => {
          logSidecar(`[error] ${error}`);
          window.__SIDECAR_DEBUG__.error = String(error);
          window.__SIDECAR_DEBUG__.status = "error";
        });

        logSidecar("Calling command.spawn()...");
        const child = await command.spawn();
        
        logSidecar(`Sidecar spawned successfully with PID: ${child.pid}`);
        window.__SIDECAR_DEBUG__.pid = child.pid;
        window.__SIDECAR_DEBUG__.status = "running";
        window.__SIDECAR_DEBUG__.childProcess = child;
        
      } catch (err) {
        const errorMsg = err?.message || String(err);
        logSidecar(`Failed to spawn sidecar: ${errorMsg}`);
        window.__SIDECAR_DEBUG__.error = errorMsg;
        window.__SIDECAR_DEBUG__.status = "spawn_failed";
        
        // Log additional error details
        if (err?.stack) {
          logSidecar(`Stack trace: ${err.stack}`);
        }
      }
    };
    
    spawnBackend();
    
    // Cleanup: kill sidecar when app closes
    return () => {
      if (window.__SIDECAR_DEBUG__?.childProcess) {
        logSidecar("Killing sidecar on app close...");
        window.__SIDECAR_DEBUG__.childProcess.kill();
        window.__SIDECAR_DEBUG__.childProcess = null;
      }
    };
  }, []);

  const { config } = useStore();
  const [yourJson, setYourJson] = useState({
    a: 23,
    b: ["ab", "cd"],
  });
  const handleChange = (e) => {
    console.log(e, "yk");
  };

  return (
    <>
      <PanelGroup
        autoSaveId="persistence"
        direction="horizontal"
        className="p-2"
        style={{ height: "100vh" }}
      >
        <Panel className="pe-1" minSize={15} defaultSize={30}>
          <div
            className="d-flex flex-column h-100"
            style={{ overflow: "hidden" }}
          >
            {/* Header - Fixed */}
            <div className="p-2 mb-2 flex-shrink-0">
              <a href="/" className="text-decoration-none text-dark">
                <img
                  src="/logo192.png"
                  alt="Cyclemetry logo"
                  className="logo"
                />
                <strong>cyclemetry</strong>
              </a>
            </div>

            {/* Template Selector - Fixed */}
            <div className="px-2 mb-2 flex-shrink-0">
              <TemplatesSection />
            </div>

            {/* Editor - Scrollable */}
            <div
              className="flex-grow-1"
              style={{ overflow: "auto", minHeight: 0 }}
            >
              {config ? (
                <Editor
                  value={yourJson}
                  onChange={handleChange}
                  theme="ace/theme/bootstrap"
                  allowedModes={["tree", "text"]}
                />
              ) : (
                <div className="p-4 text-center bg-light rounded border m-2">
                  <div className="mb-3">
                    <svg
                      width="60"
                      height="60"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <h6 className="text-muted">No Template Selected</h6>
                  <p className="small text-muted mb-0">
                    Select a community template above to see the configuration
                    here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle />
        <Panel className="ps-1" minSize={30}>
          <PreviewPanel />
        </Panel>
      </PanelGroup>
    </>
  );
}

export default App;
