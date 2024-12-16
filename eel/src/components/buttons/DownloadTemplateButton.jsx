import Button from "react-bootstrap/Button";

function DownloadTemplateButton({ editor }) {
  const downloadTemplate = () => {
    const jsonString = JSON.stringify(editor.getValue(), null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyclemetry_template.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={downloadTemplate} className="m-1">
      Download Template
    </Button>
  );
}

export default DownloadTemplateButton;
