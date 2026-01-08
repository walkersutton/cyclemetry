import { OverlaySettings, OverlayElement } from "./OverlayEditor";
import { Activity, TrendingUp, Mountain, Heart } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface OverlayPreviewProps {
  settings: OverlaySettings;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<OverlayElement>) => void;
}

export function OverlayPreview({ 
  settings, 
  selectedElementId,
  onSelectElement,
  onUpdateElement
}: OverlayPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const aspectRatio = 16 / 9;
  const baseWidth = settings.resolution === "4k" ? 3840 : 1920;
  const baseHeight = settings.resolution === "4k" ? 2160 : 1080;

  // Calculate scale to fit preview
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      const scaleX = (containerWidth - 64) / baseWidth;
      const scaleY = (containerHeight - 64) / baseHeight;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [baseWidth, baseHeight]);

  const handleMouseDown = (e: React.MouseEvent, element: OverlayElement) => {
    e.stopPropagation();
    onSelectElement(element.id);
    setDraggedElement(element.id);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedElement || !containerRef.current) return;

    const element = settings.elements.find(el => el.id === draggedElement);
    if (!element) return;

    const previewRect = containerRef.current.querySelector('.preview-canvas')?.getBoundingClientRect();
    if (!previewRect) return;

    const x = (e.clientX - previewRect.left - dragOffset.x) / scale;
    const y = (e.clientY - previewRect.top - dragOffset.y) / scale;

    onUpdateElement(element.id, {
      position: {
        x: Math.max(0, Math.min(baseWidth, Math.round(x))),
        y: Math.max(0, Math.min(baseHeight, Math.round(y))),
      }
    });
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
  };

  const renderElement = (element: OverlayElement) => {
    if (!element.enabled) return null;

    const isSelected = selectedElementId === element.id;
    const isDragging = draggedElement === element.id;

    const baseStyle = {
      position: "absolute" as const,
      left: `${element.position.x}px`,
      top: `${element.position.y}px`,
      cursor: isDragging ? "grabbing" : "grab",
      userSelect: "none" as const,
    };

    const bgColor = `${element.backgroundColor}${Math.round(element.backgroundOpacity * 255).toString(16).padStart(2, '0')}`;

    if (element.type === "map") {
      return (
        <div
          key={element.id}
          style={baseStyle}
          onMouseDown={(e) => handleMouseDown(e, element)}
          className={`rounded-lg overflow-hidden transition-all ${
            isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent" : ""
          }`}
        >
          <div 
            style={{
              width: `${element.width}px`,
              height: `${element.height}px`,
              backgroundColor: bgColor,
            }}
            className="flex items-center justify-center relative"
          >
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="0 0 400 180" 
              preserveAspectRatio="xMidYMid slice"
            >
              <path 
                d="M 50,90 Q 100,60 150,80 T 250,70 T 350,90" 
                fill="none" 
                stroke={element.accentColor}
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.6"
              />
              <circle 
                cx="250" 
                cy="70" 
                r="8" 
                fill={element.accentColor}
              />
            </svg>
            <p 
              className="text-xs z-10 opacity-50"
              style={{ 
                fontFamily: element.fontFamily,
                color: element.fontColor 
              }}
            >
              Route Map
            </p>
          </div>
        </div>
      );
    }

    const icons = {
      speed: Activity,
      distance: TrendingUp,
      elevation: Mountain,
      heartRate: Heart,
    };

    const values = {
      speed: { value: "24.3", unit: "km/h" },
      distance: { value: "12.8", unit: "km" },
      elevation: { value: "342", unit: "m" },
      heartRate: { value: "142", unit: "bpm" },
    };

    const Icon = icons[element.type as keyof typeof icons];
    const data = values[element.type as keyof typeof values];

    return (
      <div
        key={element.id}
        style={baseStyle}
        onMouseDown={(e) => handleMouseDown(e, element)}
        className={`rounded-lg px-4 py-3 transition-all ${
          isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent" : ""
        }`}
      >
        <div style={{ backgroundColor: bgColor }} className="rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon 
              className="h-5 w-5" 
              style={{ color: element.accentColor }}
            />
            <span 
              className="text-xs tracking-wider uppercase"
              style={{ 
                fontFamily: element.fontFamily,
                color: element.fontColor,
                opacity: 0.7
              }}
            >
              {element.label}
            </span>
          </div>
          <div 
            className="font-bold tabular-nums"
            style={{ 
              fontFamily: element.fontFamily,
              fontSize: `${element.fontSize}px`,
              color: element.fontColor,
              lineHeight: 1
            }}
          >
            {data.value}
            <span 
              className="ml-2"
              style={{ 
                fontSize: `${element.fontSize * 0.4}px`,
                opacity: 0.8
              }}
            >
              {data.unit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative">
        <div 
          className="preview-canvas relative bg-zinc-900 rounded-lg overflow-hidden shadow-2xl border border-zinc-800"
          style={{ 
            width: `${baseWidth * scale}px`,
            height: `${baseHeight * scale}px`,
          }}
        >
          {/* Background Video Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="url(#grid)" />
                <defs>
                  <linearGradient id="grid" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: 0.1 }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-zinc-600 text-sm">Video Background</p>
            </div>
          </div>

          {/* Scalable Overlay Layer */}
          <div 
            className="absolute inset-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: `${baseWidth}px`,
              height: `${baseHeight}px`,
            }}
          >
            {settings.elements.map(renderElement)}
          </div>

          {/* Resolution Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-sm border border-zinc-700">
              <span className="text-xs font-medium text-zinc-400">
                {settings.resolution === "4k" ? "3840 × 2160" : "1920 × 1080"}
              </span>
            </div>
          </div>
        </div>

        {/* Helper Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Click and drag elements to reposition • Click element card in sidebar to edit properties
          </p>
        </div>
      </div>
    </div>
  );
}
