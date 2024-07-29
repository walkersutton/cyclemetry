import React, { useEffect, useState } from "react";

import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

const templateUrl = (fileName) => {
  return (
    "https://raw.githubusercontent.com/walkersutton/cyclemetry/main/templates/" +
    fileName +
    ".json"
  );
};

const communityTemplateFilenames = [];

function SelectCommunityTemplateButton({ editor }) {
  const [templateFilename, setTemplateFilename] = useState(null);

  useEffect(() => {
    if (templateFilename) {
      const url = templateUrl(templateFilename);
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            console.log(
              "SelectCommunityTemplateButton:useEffect(): network response was badddd"
            );
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          editor.setValue(data);
        })
        .catch((error) => {
          console.log("error with community templates");
        });
    }
  }, [templateFilename]);

  return (
    <DropdownButton
      title="Community Templates"
      variant="warning"
      className="text-center"
    >
      {communityTemplateFilenames.map((templateFilename) => (
        <OverlayTrigger
          overlay={
            <Tooltip id="tooltip-top">
              WARNING: Selecting a community template will overwrite your
              existing configuration
            </Tooltip>
          }
          placement={"top"}
          key={templateFilename}
        >
          {/* seeing a bug when user clicks on template link and clicks back button in browser. payload looks like {'config_filename': './tmp/myconfig.json', 'gpx_filename': './tmp/.demo.gpx'} on server and both files there seem fine. seems like an image is being generated, but it doesn't have anything drawn, so idk what's up. need to investigate */}
          <Dropdown.Item onClick={() => setTemplateFilename(templateFilename)}>
            {templateFilename}
          </Dropdown.Item>
        </OverlayTrigger>
      ))}
    </DropdownButton>
  );
}

export default SelectCommunityTemplateButton;