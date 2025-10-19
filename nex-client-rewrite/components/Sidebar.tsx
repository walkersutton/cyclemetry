import React, { SetStateAction, Dispatch } from "react";

// Import Element type from P5Canvas or create a shared types file
export interface Element {
  id: string;
  text: string;
  x: number;
  y: number;
  textSize: number;
  textFont: string;
  color: string;
  type?: "text" | "chart";
  chartType?: "line" | "bar" | "scatter";
  width?: number;
  height?: number;
}

interface ElementsSidebarProps {
  selectedElement: Element | null;
  editText: string;
  editColor: string;
  onTextChange: (text: string) => void;
  onColorChange: (color: string) => void;
  onAddElement: (type: "text" | "chart") => void;
  onDeleteElement: () => void;
  onElementSelect: (element: Element) => void;
  canvasHeight: number;
  setCanvasHeight: Dispatch<SetStateAction<number>>;
  canvasWidth: number;
  setCanvasWidth: Dispatch<SetStateAction<number>>;
}

export const Sidebar: React.FC<ElementsSidebarProps> = ({
  selectedElement,
  editText,
  editColor,
  onTextChange,
  onColorChange,
  onAddElement,
  onDeleteElement,
  onElementSelect,
  setCanvasHeight,
  canvasHeight,
  setCanvasWidth,
  canvasWidth,
}) => {
  const [allElements, setAllElements] = React.useState<Element[]>([]);

  // Get all elements from p5 when component mounts or updates
  React.useEffect(() => {
    const updateElements = () => {
      if ((window as any).p5Functions) {
        const elements = (window as any).p5Functions.getAllElements();
        setAllElements(elements || []);
      }
    };

    // Update elements periodically to keep in sync
    const interval = setInterval(updateElements, 100);
    updateElements(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (element: Element) => {
    onElementSelect(element);
    if ((window as any).p5Functions) {
      (window as any).p5Functions.selectElementById(element.id);
    }
  };

  const handleFontChange = (font: string) => {
    if ((window as any).p5Functions) {
      (window as any).p5Functions.updateElementFont(font);
    }
  };

  const handleDataBindingChange = (binding: string) => {
    if ((window as any).p5Functions) {
      (window as any).p5Functions.updateElementDataBinding(binding);
    }
  };

  const handleChartTypeChange = (chartType: string) => {
    if ((window as any).p5Functions) {
      (window as any).p5Functions.updateElementChartType(chartType);
    }
  };

  const handleSizeChange = (dimension: "width" | "height", value: number) => {
    if ((window as any).p5Functions) {
      (window as any).p5Functions.updateElementSize(dimension, value);
    }
  };

  // Get default values when no element is selected
  const getDefaultValues = () => ({
    text: "",
    textSize: 24,
    color: "#000000",
    textFont: "Arial",
    type: "text" as const,
    chartType: "line" as const,
    width: 200,
    height: 150,
  });

  const currentValues = selectedElement || getDefaultValues();
  const isDisabled = !selectedElement;

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Controls</h2>

      {/* Add Scene Settings */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {`Canvas Height: ${canvasHeight}`}
        </label>
        <input
          type="range"
          min="0"
          max="2160"
          value={canvasHeight}
          onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
          className={`w-full`}
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {`Canvas Width: `}
          <input
            type="number"
            value={canvasWidth}
            onChange={(e) => setCanvasWidth(Number(e.target.value))}
            className="inline p-1"
            // className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <input
          type="range"
          min="0"
          max="3840"
          value={canvasWidth}
          onChange={(e) => setCanvasWidth(parseInt(e.target.value))}
          className={`w-full`}
        />
      </div>

      {/* Add Element */}
      <div className="mb-6">
        <div className="space-y-2">
          <button
            onClick={() => onAddElement("text")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Add Text Element
          </button>
          <button
            onClick={() => onAddElement("chart")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Add Chart Element
          </button>
        </div>
      </div>

      {/* Elements List */}
      {allElements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Elements</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allElements.map((element) => (
              <div
                key={element.id}
                onClick={() => handleCardClick(element)}
                className={`p-3 border rounded-md cursor-pointer transition-all ${
                  selectedElement?.id === element.id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: element.color }}
                      ></div>
                      {element.type === "chart" && (
                        <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                          📊
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {element.type === "chart"
                        ? `${element.chartType || "line"} chart`
                        : element.text || "Untitled"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {element.type === "chart"
                      ? `${element.width || 200}×${element.height || 150}`
                      : `${element.textSize}px`}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ({Math.round(element.x)}, {Math.round(element.y)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Element Properties */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">
          Element Properties
          {!selectedElement && (
            <span className="text-gray-400 font-normal">
              {" "}
              (Select an element to edit)
            </span>
          )}
        </h3>

        {/* Element Type Display */}
        {/* {selectedElement && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Type
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600">
              {selectedElement.type === "chart" ? "📊 Chart" : "🔤 Text"}
            </div>
          </div>
        )} */}

        {/* Text Content - only show for text elements */}
        {(!selectedElement || currentValues.type === "text") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Content
            </label>
            <input
              type="text"
              value={selectedElement ? editText : ""}
              onChange={(e) => onTextChange(e.target.value)}
              disabled={isDisabled}
              className={`w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDisabled ? "bg-gray-50 text-gray-400" : ""
              }`}
              placeholder="Enter text..."
            />
          </div>
        )}

        {/* Chart Type - only show for chart elements */}
        {selectedElement?.type === "chart" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chart Type
            </label>
            <select
              value={currentValues.chartType || "line"}
              onChange={(e) => handleChartTypeChange(e.target.value)}
              disabled={isDisabled}
              className={`w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDisabled ? "bg-gray-50 text-gray-400" : ""
              }`}
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="scatter">Scatter Plot</option>
            </select>
          </div>
        )}

        {/* Size controls - show for chart elements or when no element selected */}
        {(!selectedElement || currentValues.type === "chart") && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width
              </label>
              <input
                type="range"
                min="100"
                max="500"
                value={currentValues.width || 200}
                onChange={(e) =>
                  handleSizeChange("width", parseInt(e.target.value))
                }
                disabled={isDisabled}
                className={`w-full ${isDisabled ? "opacity-50" : ""}`}
              />
              <span
                className={`text-sm ${
                  isDisabled ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {currentValues.width || 200}px
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height
              </label>
              <input
                type="range"
                min="100"
                max="400"
                value={currentValues.height || 150}
                onChange={(e) =>
                  handleSizeChange("height", parseInt(e.target.value))
                }
                disabled={isDisabled}
                className={`w-full ${isDisabled ? "opacity-50" : ""}`}
              />
              <span
                className={`text-sm ${
                  isDisabled ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {currentValues.height || 150}px
              </span>
            </div>
          </>
        )}

        {/* Font Size - only show for text elements */}
        {(!selectedElement || currentValues.type === "text") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <input
              type="range"
              min="12"
              max="72"
              value={currentValues.textSize}
              onChange={(e) => {
                if ((window as any).p5Functions && selectedElement) {
                  (window as any).p5Functions.updateElementTextSize(
                    parseInt(e.target.value)
                  );
                }
              }}
              disabled={isDisabled}
              className={`w-full ${isDisabled ? "opacity-50" : ""}`}
            />
            <span
              className={`text-sm ${
                isDisabled ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {currentValues.textSize}px
            </span>
          </div>
        )}

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="color"
            value={selectedElement ? editColor : "#000000"}
            onChange={(e) => onColorChange(e.target.value)}
            disabled={isDisabled}
            className={`w-full h-10 border border-gray-300 rounded-md ${
              isDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>

        {/* Font Family - only show for text elements */}
        {(!selectedElement || currentValues.type === "text") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Family
            </label>
            <select
              value={currentValues.textFont}
              onChange={(e) => handleFontChange(e.target.value)}
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDisabled ? "bg-gray-50 text-gray-400" : ""
              }`}
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
        )}

        {/* Data Binding */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Binding
          </label>
          <select
            onChange={(e) => handleDataBindingChange(e.target.value)}
            disabled={isDisabled}
            className={`w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDisabled ? "bg-gray-50 text-gray-400" : ""
            }`}
          >
            <option value="none">None</option>
            <option value="heartrate">Heart Rate</option>
            <option value="temperature">Temperature</option>
            <option value="speed">Speed</option>
            <option value="dataset1">Dataset 1</option>
            <option value="dataset2">Dataset 2</option>
          </select>
        </div>

        {/* Delete Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onDeleteElement}
            disabled={isDisabled}
            className={`w-full px-4 py-2 font-medium rounded-md transition-colors ${
              isDisabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            Delete Element
          </button>
        </div>
      </div>
    </div>
  );
};
