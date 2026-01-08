import { useState } from "react";
import { OverlayPreview } from "./OverlayPreview";
import { ControlPanel } from "./ControlPanel";
import { Button } from "./ui/button";
import { Play, Upload } from "lucide-react";

export type ElementType = "speed" | "distance" | "elevation" | "heartRate" | "map";

export interface OverlayElement {
  id: string;
  type: ElementType;
  label: string;
  enabled: boolean;
  position: {
    x: number;
    y: number;
  };
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  width?: number;
  height?: number;
}

export interface OverlaySettings {
  resolution: "1080p" | "4k";
  elements: OverlayElement[];
}

const defaultElements: OverlayElement[] = [
  {
    id: "speed",
    type: "speed",
    label: "Speed",
    enabled: true,
    position: { x: 50, y: 50 },
    fontSize: 48,
    fontFamily: "Inter",
    fontColor: "#ffffff",
    accentColor: "#3b82f6",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
  },
  {
    id: "distance",
    type: "distance",
    label: "Distance",
    enabled: true,
    position: { x: 50, y: 200 },
    fontSize: 32,
    fontFamily: "Inter",
    fontColor: "#ffffff",
    accentColor: "#3b82f6",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
  },
  {
    id: "elevation",
    type: "elevation",
    label: "Elevation",
    enabled: true,
    position: { x: 1600, y: 50 },
    fontSize: 32,
    fontFamily: "Inter",
    fontColor: "#ffffff",
    accentColor: "#3b82f6",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
  },
  {
    id: "heartRate",
    type: "heartRate",
    label: "Heart Rate",
    enabled: true,
    position: { x: 1600, y: 200 },
    fontSize: 32,
    fontFamily: "Inter",
    fontColor: "#ffffff",
    accentColor: "#3b82f6",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
  },
  {
    id: "map",
    type: "map",
    label: "Route Map",
    enabled: true,
    position: { x: 50, y: 880 },
    fontSize: 16,
    fontFamily: "Inter",
    fontColor: "#ffffff",
    accentColor: "#3b82f6",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
    width: 1820,
    height: 180,
  },
];

export function OverlayEditor() {
  const [settings, setSettings] = useState<OverlaySettings>({
    resolution: "1080p",
    elements: defaultElements,
  });
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>("speed");

  const updateResolution = (resolution: "1080p" | "4k") => {
    setSettings((prev) => ({ ...prev, resolution }));
  };

  const updateElement = (id: string, updates: Partial<OverlayElement>) => {
    setSettings((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  };

  const selectedElement = settings.elements.find(el => el.id === selectedElementId);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <div>
              <h1 className="font-semibold">GPX Overlay Editor</h1>
              <p className="text-xs text-muted-foreground">morning_ride.gpx</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload GPX
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Play className="mr-2 h-4 w-4" />
              Render Video
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0a]">
          <OverlayPreview 
            settings={settings} 
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={updateElement}
          />
        </div>

        {/* Controls */}
        <div className="w-96 border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
          <ControlPanel 
            settings={settings}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElementId}
            onUpdateElement={updateElement}
            onUpdateResolution={updateResolution}
          />
        </div>
      </div>
    </div>
  );
}
