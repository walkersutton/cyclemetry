"use client";
import React, { useEffect, useRef, useState } from "react";
import p5Types from "p5";

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
  dataBinding?: string;
}

interface P5CanvasProps {
  onElementSelected: (element: Element | null) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const P5Canvas: React.FC<P5CanvasProps> = ({
  onElementSelected,
  canvasWidth,
  canvasHeight,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [scale, setScale] = useState(1);

  const sketch = (p5: p5Types, parentRef: HTMLDivElement) => {
    // All state lives inside p5 sketch
    let elements: Element[] = [];
    let currentSelectedElement: Element | null = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // Sample data for charts
    const sampleData = {
      heartrate: [72, 75, 68, 82, 79, 85, 73, 77, 80, 74],
      temperature: [20.5, 21.2, 19.8, 22.1, 23.5, 22.8, 21.9, 20.7, 22.3, 21.6],
      speed: [45, 52, 38, 61, 47, 55, 49, 43, 58, 51],
      dataset1: [10, 25, 15, 35, 20, 30, 18, 28, 22, 32],
      dataset2: [5, 15, 25, 10, 30, 20, 35, 12, 28, 18],
    };

    function selectElement(element: Element) {
      currentSelectedElement = element;
      onElementSelected(element);
    }

    function addElement(type: "text" | "chart", text?: string) {
      const newElement: Element = {
        id: Date.now().toString(),
        text:
          text || (type === "text" ? `Text ${elements.length + 1}` : "Chart"),
        x: p5.random(150, canvasWidth - 150),
        y: p5.random(150, canvasHeight - 150),
        textSize: 24,
        textFont: "Arial",
        color: type === "chart" ? "#3B82F6" : "#000000",
        type: type,
        chartType: type === "chart" ? "line" : undefined,
        width: type === "chart" ? 200 : undefined,
        height: type === "chart" ? 150 : undefined,
        dataBinding: "none",
      };
      elements.push(newElement);
      return newElement;
    }

    function isPointInElement(x: number, y: number, element: Element) {
      if (element.type === "chart") {
        const width = element.width || 200;
        const height = element.height || 150;
        return (
          x >= element.x - width / 2 &&
          x <= element.x + width / 2 &&
          y >= element.y - height / 2 &&
          y <= element.y + height / 2
        );
      } else {
        // Text element hit detection
        p5.textSize(element.textSize);
        p5.textFont(element.textFont);
        let textW = p5.textWidth(element.text);
        let textH = element.textSize;

        return (
          x >= element.x - textW / 2 - 10 &&
          x <= element.x + textW / 2 + 10 &&
          y >= element.y - textH / 2 - 5 &&
          y <= element.y + textH / 2 + 5
        );
      }
    }

    function getDataForBinding(binding: string): number[] {
      if (binding && sampleData[binding as keyof typeof sampleData]) {
        return sampleData[binding as keyof typeof sampleData];
      }
      return [10, 25, 15, 35, 20, 30, 18, 28, 22, 32]; // default data
    }

    // Expose functions to external components
    (window as any).p5Functions = {
      updateElementText: (text: string) => {
        if (currentSelectedElement) {
          currentSelectedElement.text = text;
          onElementSelected({ ...currentSelectedElement });
        }
      },
      updateElementColor: (color: string) => {
        if (currentSelectedElement) {
          const isValidColor = (colorString: string): boolean => {
            if (/^#([0-9A-F]{3}){1,2}$/i.test(colorString)) {
              return true;
            }
            const testElement = document.createElement("div");
            testElement.style.color = colorString;
            const isValid = testElement.style.color !== "";
            testElement.remove();
            return isValid;
          };

          if (isValidColor(color)) {
            currentSelectedElement.color = color;
            onElementSelected({ ...currentSelectedElement });
          }
        }
      },
      updateElementTextSize: (size: number) => {
        if (currentSelectedElement) {
          currentSelectedElement.textSize = size;
          onElementSelected({ ...currentSelectedElement });
        }
      },
      updateElementFont: (font: string) => {
        if (currentSelectedElement) {
          currentSelectedElement.textFont = font;
          onElementSelected({ ...currentSelectedElement });
        }
      },
      updateElementChartType: (chartType: string) => {
        if (currentSelectedElement && currentSelectedElement.type === "chart") {
          currentSelectedElement.chartType = chartType as
            | "line"
            | "bar"
            | "scatter";
          onElementSelected({ ...currentSelectedElement });
        }
      },
      updateElementSize: (dimension: "width" | "height", value: number) => {
        if (currentSelectedElement && currentSelectedElement.type === "chart") {
          if (dimension === "width") {
            currentSelectedElement.width = value;
          } else {
            currentSelectedElement.height = value;
          }
          onElementSelected({ ...currentSelectedElement });
        }
      },
      updateElementDataBinding: (binding: string) => {
        if (currentSelectedElement) {
          currentSelectedElement.dataBinding = binding;
          onElementSelected({ ...currentSelectedElement });
        }
      },
      addNewElement: (type: "text" | "chart" = "text") => {
        const newElement = addElement(type);
        selectElement(newElement);
      },
      deleteSelected: () => {
        if (currentSelectedElement) {
          elements = elements.filter(
            (el) => el.id !== currentSelectedElement?.id
          );
          currentSelectedElement = null;
          onElementSelected(null);
        }
      },
      getAllElements: () => elements,
      getSelectedElement: () => currentSelectedElement,
      selectElementById: (id: string) => {
        const element = elements.find((el) => el.id === id);
        if (element) {
          selectElement(element);
        }
      },
    };

    p5.mouseReleased = () => {
      isDragging = false;
    };

    p5.mousePressed = () => {
      if (
        p5.mouseX < 0 ||
        p5.mouseX > canvasWidth ||
        p5.mouseY < 0 ||
        p5.mouseY > canvasHeight
      ) {
        return;
      }

      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(p5.mouseX, p5.mouseY, elements[i])) {
          selectElement(elements[i]);
          isDragging = true;
          dragOffset.x = p5.mouseX - elements[i].x;
          dragOffset.y = p5.mouseY - elements[i].y;
          return;
        }
      }

      currentSelectedElement = null;
      onElementSelected(null);
    };

    p5.mouseDragged = () => {
      if (isDragging && currentSelectedElement) {
        currentSelectedElement.x = p5.mouseX - dragOffset.x;
        currentSelectedElement.y = p5.mouseY - dragOffset.y;
        onElementSelected({ ...currentSelectedElement });
      }
    };

    p5.setup = () => {
      p5.createCanvas(canvasWidth, canvasHeight).parent(parentRef);

      // Add some initial elements
      addElement("text", "Hello World");
      // addElement("chart");
    };

    function drawTextElement(element: Element): void {
      p5.push();
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.textSize(element.textSize);
      p5.textFont(element.textFont);
      p5.fill(element.color);
      p5.noStroke();
      p5.text(element.text, element.x, element.y);
      p5.pop();
    }

    function drawChartElement(element: Element): void {
      const width = element.width || 200;
      const height = element.height || 150;
      const data = getDataForBinding(element.dataBinding || "none");
      const chartType = element.chartType || "line";

      p5.push();
      p5.translate(element.x - width / 2, element.y - height / 2);

      // Draw chart background
      p5.fill(255);
      p5.stroke(200);
      p5.rect(0, 0, width, height);

      // Draw chart content area
      const padding = 30;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      if (data.length > 0) {
        const maxVal = Math.max(...data);
        const minVal = Math.min(...data);
        const range = maxVal - minVal || 1;

        p5.stroke(element.color);
        p5.strokeWeight(2);
        p5.fill(element.color);

        if (chartType === "line") {
          // Draw line chart
          p5.noFill();
          p5.beginShape();
          for (let i = 0; i < data.length; i++) {
            const x = padding + (i / (data.length - 1)) * chartWidth;
            const y =
              padding +
              chartHeight -
              ((data[i] - minVal) / range) * chartHeight;
            p5.vertex(x, y);
          }
          p5.endShape();

          // Draw data points
          p5.fill(element.color);
          for (let i = 0; i < data.length; i++) {
            const x = padding + (i / (data.length - 1)) * chartWidth;
            const y =
              padding +
              chartHeight -
              ((data[i] - minVal) / range) * chartHeight;
            p5.circle(x, y, 6);
          }
        } else if (chartType === "bar") {
          // Draw bar chart
          const barWidth = (chartWidth / data.length) * 0.8;
          const barSpacing = (chartWidth / data.length) * 0.2;

          for (let i = 0; i < data.length; i++) {
            const x = padding + i * (chartWidth / data.length) + barSpacing / 2;
            const barHeight = ((data[i] - minVal) / range) * chartHeight;
            const y = padding + chartHeight - barHeight;
            p5.rect(x, y, barWidth, barHeight);
          }
        } else if (chartType === "scatter") {
          // Draw scatter plot
          for (let i = 0; i < data.length; i++) {
            const x = padding + (i / (data.length - 1)) * chartWidth;
            const y =
              padding +
              chartHeight -
              ((data[i] - minVal) / range) * chartHeight;
            p5.circle(x, y, 8);
          }
        }
      }

      // Draw chart title
      p5.fill(100);
      p5.textAlign(p5.CENTER, p5.TOP);
      p5.textSize(12);
      p5.noStroke();
      const title =
        element.dataBinding && element.dataBinding !== "none"
          ? `${element.chartType || "line"} - ${element.dataBinding}`
          : `${element.chartType || "line"} chart`;
      p5.text(title, width / 2, 5);

      p5.pop();
    }

    function drawElement(element: Element): void {
      if (element.type === "chart") {
        drawChartElement(element);
      } else {
        drawTextElement(element);
      }
    }

    function drawSelectionBox(element: Element): void {
      p5.push();
      p5.stroke(0, 100, 255);
      p5.strokeWeight(2);
      p5.noFill();

      if (element.type === "chart") {
        const width = element.width || 200;
        const height = element.height || 150;
        p5.rect(
          element.x - width / 2 - 5,
          element.y - height / 2 - 5,
          width + 10,
          height + 10
        );
      } else {
        // Text element selection box
        p5.textSize(element.textSize);
        p5.textFont(element.textFont);
        let textW = p5.textWidth(element.text);
        let textH = element.textSize;

        p5.rect(
          element.x - textW / 2 - 10,
          element.y - textH / 2 - 5,
          textW + 20,
          textH + 10
        );
      }

      p5.pop();
    }

    p5.draw = () => {
      p5.background(240);

      // Draw all elements
      elements.forEach((element: Element) => {
        drawElement(element);
      });

      // Draw selection box for selected element
      if (currentSelectedElement) {
        drawSelectionBox(currentSelectedElement);
      }
    };
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const handleResize = () => {
      const scaleX = window.innerWidth / canvasWidth;
      const scaleY = window.innerHeight / canvasHeight;
      setScale(Math.min(1, Math.min(scaleX, scaleY)));
    };

    handleResize(); // compute initially
    window.addEventListener("resize", handleResize);

    let p5instance: p5Types;

    const initP5 = async () => {
      try {
        const p5 = (await import("p5")).default;
        p5instance = new p5((p) => {
          sketch(p, parentRef.current!);
        });
      } catch (error) {
        console.log(error);
      }
    };

    initP5();
    return () => {
      if (p5instance) {
        p5instance.remove();
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [isMounted, canvasWidth, canvasHeight]);

  return (
    // <div className="bg-white shadow-lg">
    //   <div ref={parentRef}></div>
    // </div>

    <div className="bg-white shadow-lg overflow-hidden">
      <div
        ref={parentRef}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      ></div>
    </div>
  );
};
