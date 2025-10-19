// "use client";
// import React, {
//   FC,
//   useContext,
//   useState,
//   Dispatch,
//   SetStateAction,
//   createContext,
//   ReactNode,
// } from "react";

// type ElementType = "text";

// export interface Element {
//   id: number;
//   type: ElementType;
//   x: number;
//   y: number;
//   text: string;
//   textSize: number;
//   textFont: string; // maybe make this a type
//   color: string;
//   dataBinding?: string; //  maybe make this a generated type based on GPX file?
// }

// interface Canvas {
//   canvasWidth: number;
//   setCanvasWidth: Dispatch<SetStateAction<number>>;
//   canvasHeight: number;
//   setCanvasHeight: Dispatch<SetStateAction<number>>;
// }

// export interface SketchContext {
//   canvas: Canvas;
//   setCanvas: Dispatch<SetStateAction<Canvas>>;
//   elements: Element[];
//   setElements: Dispatch<SetStateAction<Element[]>>;
//   selectedElement: Element | null;
//   setSelectedElement: Dispatch<SetStateAction<Element | null>>;
//   isDragging: boolean;
//   setIsDragging: Dispatch<SetStateAction<boolean>>;
// }

// export interface AppContext {
//   sketchContext: SketchContext;
//   setSketchContext: Dispatch<SetStateAction<SketchContext>>;
//   // probably also want gpx file name, template name, parsed gpx file, etc.
// }

// const AppContext = createContext<AppContext | undefined>(undefined);

// export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
//   const [canvasWidth, setCanvasWidth] = useState<number>(640);
//   const [canvasHeight, setCanvasHeight] = useState<number>(360);
//   const [elements, setElements] = useState<Element[]>([]);
//   const [selectedElement, setSelectedElement] = useState<Element | null>(null);
//   const [isDragging, setIsDragging] = useState<boolean>(false);

//   // Create canvas object
//   const canvas: Canvas = {
//     canvasWidth,
//     setCanvasWidth,
//     canvasHeight,
//     setCanvasHeight,
//   };

//   const [canvasState, setCanvasState] = useState<Canvas>(canvas);

//   // Create sketch context with live state values
//   const sketchContext: SketchContext = {
//     canvas: canvasState,
//     setCanvas: setCanvasState,
//     elements, // Use the live state
//     setElements, // Use the live setter
//     selectedElement, // Use the live state
//     setSelectedElement, // Use the live setter
//     isDragging, // Use the live state
//     setIsDragging, // Use the live setter
//   };

//   const appContext: AppContext = {
//     sketchContext,
//     setSketchContext: () => {}, // This can be a no-op since we're managing state directly
//   };

//   return (
//     <AppContext.Provider value={appContext}>{children}</AppContext.Provider>
//   );
// };

// export function useAppContext() {
//   const context = useContext(AppContext);
//   if (!context) {
//     throw new Error("useAppContext must be used within an AppProvider");
//   }
//   return context;
// }
