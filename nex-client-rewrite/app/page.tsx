"use client";
import React, { useState } from "react";
import { P5Canvas, Element } from "@/components/p5utils";
import { Sidebar } from "@/components/Sidebar";

export default function EditorPage() {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(720);
  const [canvasHeight, setCanvasHeight] = useState(576);
  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState("#000000");

  // Handle element selection from canvas
  const handleElementSelected = (element: Element | null) => {
    setSelectedElement(element);
    if (element) {
      setEditText(element.text);
      setEditColor(element.color);
    }
  };

  // Handle element selection from sidebar
  const handleElementSelect = (element: Element) => {
    setSelectedElement(element);
    setEditText(element.text);
    setEditColor(element.color);
  };

  // Handle text input change
  const handleTextChange = (newText: string) => {
    setEditText(newText);
    if ((window as any).p5Functions) {
      (window as any).p5Functions.updateElementText(newText);
    }
  };

  // Handle color input change
  const handleColorChange = (newColor: string) => {
    setEditColor(newColor);
    if ((window as any).p5Functions) {
      (window as any).p5Functions.updateElementColor(newColor);
    }
  };

  // Handle add new element - now supports both text and chart types
  const handleAddElement = (type: "text" | "chart" = "text") => {
    if ((window as any).p5Functions) {
      (window as any).p5Functions.addNewElement(type);
    }
  };

  // Handle delete element
  const handleDeleteElement = () => {
    if ((window as any).p5Functions) {
      (window as any).p5Functions.deleteSelected();
    }
  };

  return (
    // <div className="max-w-8xl mx-auto">
    <div className="mx-auto">
      <h1 className="text-3xl font-bold mb-6 p-4">Cyclemetry</h1>
      <div className="flex gap-4 p-4">
        {/* Sidebar */}
        <Sidebar
          selectedElement={selectedElement}
          editText={editText}
          editColor={editColor}
          onTextChange={handleTextChange}
          onColorChange={handleColorChange}
          onAddElement={handleAddElement}
          onDeleteElement={handleDeleteElement}
          onElementSelect={handleElementSelect}
          canvasHeight={canvasHeight}
          setCanvasHeight={setCanvasHeight}
          canvasWidth={canvasWidth}
          setCanvasWidth={setCanvasWidth}
        />
        {/* Canvas */}
        <P5Canvas
          onElementSelected={handleElementSelected}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      </div>
    </div>
  );
}
