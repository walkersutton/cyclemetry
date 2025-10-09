import React from "react";

import DemoPreview from "./components/DemoPreviewComponent";
import ActivitySection from "./components/ActivitySection";
import RenderSection from "./components/RenderSection";
import BackendStatus from "./components/BackendStatus";

function PreviewPanel() {
  return (
    <div className="stuckk pe-2">
      {/* Backend Connection Status */}
      <BackendStatus />

      {/* Preview Image */}
      <DemoPreview />

      <div className="row g-2 mt-2">
        <RenderSection />
        <ActivitySection />
      </div>

      {/* Links */}
      <div className="p-2">
        <p>
          <a href="https://github.com/walkersutton/cyclemetry/blob/main/templates/README.md">
            Template Schema
          </a>
          <br />
          <a href="https://github.com/walkersutton/cyclemetry">GitHub repo</a>
        </p>
      </div>
    </div>
  );
}

export default PreviewPanel;
