import React from "react";

import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

/// todo maybe can replace this with parsing public/tempaltes folder for json files???
const communityTemplateFilenames = ["walker_crit_a.json", "safa_brian_a_4k_gradient.json"];

function SelectCommunityTemplateButton({ communityTemplateFilename, handleCommunityTemplateFilenameStateChange }) {

  return (
    <OverlayTrigger
      overlay={
        <Tooltip id="tooltip-top">
          WARNING: Selecting a community template will overwrite your existing
          configuration
        </Tooltip>
      }
      placement={"top"}
      key={communityTemplateFilename}
    >
      <DropdownButton
        title={communityTemplateFilename ?? "Community Templates"}
        variant={communityTemplateFilename ? "success" : "warning"}
        className="text-center m-1"
      >
        {/* also happens when user clicks back button from github link on bottom of editor */}
        {/* seeing a bug when user clicks on template link and clicks back button in browser. payload looks like {'config_filename': './tmp/myconfig.json', 'gpx_filename': './tmp/.demo.gpx'} on server and both files there seem fine. seems like an image is being generated, but it doesn't have anything drawn, so idk what's up. need to investigate */}
        {/* todo don't pull these from github.com */}
        {communityTemplateFilenames.map((templateFilename, index) => (
          <Dropdown.Item
            onClick={() => handleCommunityTemplateFilenameStateChange(templateFilename)}
            key={index}
          >
            {templateFilename}
          </Dropdown.Item>
        ))}
      </DropdownButton>
    </OverlayTrigger>
  );
}

export default SelectCommunityTemplateButton;
