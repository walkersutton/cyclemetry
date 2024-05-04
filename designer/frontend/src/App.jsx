import React from "react";

import Editor from "./Editor"; // Import the MyJsonEditor component
import FileUpload from "./FileUpload";
import illyimg from "./test.png";

function App() {
  return (
    <div>
      <h1 className="text-center">Cyclemetry Designer</h1>
      <div className="container">
        <div className="row">
          <FileUpload />
        </div>
        <div className="row">
          <div className="col-sm">
            <Editor />
          </div>
          <div className="col-sm">
            <img src={illyimg} alt="demo frame heyooo" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
