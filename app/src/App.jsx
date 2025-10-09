import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import { Panel, PanelResizeHandle, PanelGroup } from "react-resizable-panels";
import Editor from './Editor';
import PreviewPanel from "./PreviewPanel";
import TemplatesSection from "./components/TemplatesSection";
import useStore from "./store/useStore";
import "jsoneditor-react/es/editor.min.css";

function App() {
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
      >
        <Panel className="pe-1" minSize={15} defaultSize={30}>
          <div className="p-2 mb-2" style={{ overflow: "auto" }}>
            <a href="/" className="text-decoration-none text-dark">
              <img src="/logo192.png" alt="Cyclemetry logo" className="logo" />
              <strong>cyclemetry</strong>
            </a>
          </div>

          {/* Template Selector */}
          <div className="px-2 mb-2">
            <TemplatesSection />
          </div>

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
                Select a community template above to see the configuration here.
              </p>
            </div>
          )}
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
