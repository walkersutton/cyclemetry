import React from "react";
import SelectCommunityTemplateButton from "./buttons/SelectCommunityTemplateButton";
import LoadTemplateButton from "./buttons/LoadTemplateButton";
import SaveTemplateButton from "./buttons/SaveTemplateButton";

function TemplatesSection() {
  return (
    <div className="card bg-light">
      <div className="card-body p-2">
        <h6 className="card-title mb-2">Templates</h6>
        <div className="d-flex flex-wrap gap-1">
          <SelectCommunityTemplateButton />
          <LoadTemplateButton />
          <SaveTemplateButton />
        </div>
      </div>
    </div>
  );
}

export default TemplatesSection;
