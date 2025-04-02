import Button from "react-bootstrap/Button";

function SaveTemplateButton({ editor }) {
  const saveTemplate = () => {
    const jsonString = JSON.stringify(editor.getValue(), null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // maybe date title time these like screenshots on mac?
    link.download = "cyclemetry_template.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={saveTemplate} className="m-1">
      Save Template
    </Button>
  );
}

export default SaveTemplateButton;
