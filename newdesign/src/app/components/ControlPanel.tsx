import { OverlaySettings, OverlayElement } from "./OverlayEditor";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Card } from "./ui/card";
import { Activity, TrendingUp, Mountain, Heart, Map, Video, Type, Palette, Move } from "lucide-react";

interface ControlPanelProps {
  settings: OverlaySettings;
  selectedElement: OverlayElement | undefined;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<OverlayElement>) => void;
  onUpdateResolution: (resolution: "1080p" | "4k") => void;
}

const elementIcons = {
  speed: Activity,
  distance: TrendingUp,
  elevation: Mountain,
  heartRate: Heart,
  map: Map,
};

export function ControlPanel({ 
  settings, 
  selectedElement,
  onSelectElement, 
  onUpdateElement,
  onUpdateResolution 
}: ControlPanelProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Video Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold">Video Settings</h3>
        </div>
        <div>
          <Label htmlFor="resolution" className="text-sm mb-2 block">
            Resolution
          </Label>
          <Select
            value={settings.resolution}
            onValueChange={(value: "1080p" | "4k") => onUpdateResolution(value)}
          >
            <SelectTrigger id="resolution">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1080p">1080p (1920 × 1080)</SelectItem>
              <SelectItem value="4k">4K (3840 × 2160)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Elements List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Overlay Elements</h3>
        <div className="space-y-2">
          {settings.elements.map((element) => {
            const Icon = elementIcons[element.type];
            const isSelected = selectedElement?.id === element.id;
            
            return (
              <Card
                key={element.id}
                className={`p-3 cursor-pointer transition-all hover:border-blue-500 ${
                  isSelected ? "border-blue-500 bg-blue-500/10" : "border-border"
                }`}
                onClick={() => onSelectElement(element.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon 
                      className="h-4 w-4" 
                      style={{ color: element.accentColor }}
                    />
                    <span className="text-sm font-medium">{element.label}</span>
                  </div>
                  <Switch
                    checked={element.enabled}
                    onCheckedChange={(checked) => 
                      onUpdateElement(element.id, { enabled: checked })
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Element Properties */}
      {selectedElement && (
        <>
          <Separator />
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">
                {selectedElement.label} Properties
              </h3>
            </div>

            {/* Position */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Move className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-sm">Position</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pos-x" className="text-xs mb-1 block">
                    X Position
                  </Label>
                  <Input
                    id="pos-x"
                    type="number"
                    value={selectedElement.position.x}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, {
                        position: { 
                          ...selectedElement.position, 
                          x: parseInt(e.target.value) || 0 
                        }
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="pos-y" className="text-xs mb-1 block">
                    Y Position
                  </Label>
                  <Input
                    id="pos-y"
                    type="number"
                    value={selectedElement.position.y}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, {
                        position: { 
                          ...selectedElement.position, 
                          y: parseInt(e.target.value) || 0 
                        }
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              {selectedElement.type === "map" && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label htmlFor="width" className="text-xs mb-1 block">
                      Width
                    </Label>
                    <Input
                      id="width"
                      type="number"
                      value={selectedElement.width || 400}
                      onChange={(e) => 
                        onUpdateElement(selectedElement.id, {
                          width: parseInt(e.target.value) || 400
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs mb-1 block">
                      Height
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      value={selectedElement.height || 180}
                      onChange={(e) => 
                        onUpdateElement(selectedElement.id, {
                          height: parseInt(e.target.value) || 180
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Typography */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Type className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-sm">Typography</h4>
              </div>
              
              <div>
                <Label htmlFor="font-family" className="text-xs mb-1 block">
                  Font Family
                </Label>
                <Select
                  value={selectedElement.fontFamily}
                  onValueChange={(value) => 
                    onUpdateElement(selectedElement.id, { fontFamily: value })
                  }
                >
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="font-size" className="text-xs mb-2 block">
                  Font Size: {selectedElement.fontSize}px
                </Label>
                <Slider
                  id="font-size"
                  min={12}
                  max={96}
                  step={4}
                  value={[selectedElement.fontSize]}
                  onValueChange={([value]) => 
                    onUpdateElement(selectedElement.id, { fontSize: value })
                  }
                  className="py-4"
                />
              </div>

              <div>
                <Label htmlFor="font-color" className="text-xs mb-1 block">
                  Text Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="font-color"
                    type="color"
                    value={selectedElement.fontColor}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, { fontColor: e.target.value })
                    }
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={selectedElement.fontColor}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, { fontColor: e.target.value })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Colors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-sm">Colors & Style</h4>
              </div>

              <div>
                <Label htmlFor="accent-color" className="text-xs mb-1 block">
                  Accent Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accent-color"
                    type="color"
                    value={selectedElement.accentColor}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, { accentColor: e.target.value })
                    }
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={selectedElement.accentColor}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, { accentColor: e.target.value })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bg-color" className="text-xs mb-1 block">
                  Background Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    value={selectedElement.backgroundColor}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, { backgroundColor: e.target.value })
                    }
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={selectedElement.backgroundColor}
                    onChange={(e) => 
                      onUpdateElement(selectedElement.id, { backgroundColor: e.target.value })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bg-opacity" className="text-xs mb-2 block">
                  Background Opacity: {Math.round(selectedElement.backgroundOpacity * 100)}%
                </Label>
                <Slider
                  id="bg-opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[selectedElement.backgroundOpacity]}
                  onValueChange={([value]) => 
                    onUpdateElement(selectedElement.id, { backgroundOpacity: value })
                  }
                  className="py-4"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
