import React, { useEffect, useLayoutEffect, useRef, useCallback } from "react";
import rough from "roughjs";
import {
  usePressedKeys,
  drawElement,
  adjustElementCoordinates,
  getElementAtPosition,
  resizedCoordinates,
  cursorForPosition,
  createElement,
  adjustmentRequired,
  getStrokeBounds,
  getRandomId,
  updateCursor,
  scaleCanvas,
  shouldDeleteElement,
} from "./utils";
import Toolbar from "./components/Toolbar";
import useAppState from "./store/state";
import { useHistory } from "./hooks/useHistory";
import { Action, ElementPosition, TypesTools } from "./types";
import { useKeyboard } from "./hooks/useKeyboard";
import "./App.css";

const App = () => {
  const {
    tool,
    color,
    action,
    setAction,
    activeElement,
    setActiveElement,
    selectedElement,
    setSelectedElement,
    panOffset,
    setPanOffset,
    startPanMousePosition,
    setStartPanMousePosition,
    pendingEraseIds,
    setPendingEraseIds,
    dimensions,
    setDimensions,
  } = useAppState();

  const { elements, setElements, undo } = useHistory();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const pressedKeys = usePressedKeys();

  const drawAllElements = useCallback(
    (
      canvas: HTMLCanvasElement,
      context: CanvasRenderingContext2D,
      width: number,
      height: number,
      withOffset: boolean = true
    ) => {
      const roughCanvas = rough.canvas(canvas);

      context.clearRect(0, 0, width, height);

      context.save();
      if (withOffset) context.translate(panOffset.x, panOffset.y);

      elements.forEach((element) => {
        if (action === Action.Writing && activeElement?.id === element.id)
          return;
        drawElement(
          roughCanvas,
          context,
          element,
          pendingEraseIds,
          selectedElement
        );
      });
      context.restore();
    },
    [
      elements,
      action,
      activeElement,
      panOffset,
      pendingEraseIds,
      selectedElement,
    ]
  );

  const redrawCanvas = useCallback(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const { width, height } = scaleCanvas(canvas, context);
    drawAllElements(canvas, context, width, height);
  }, [drawAllElements]);

  useLayoutEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const panFunction = (event: WheelEvent) => {
      setPanOffset({
        x: panOffset.x - event.deltaX,
        y: panOffset.y - event.deltaY,
      });
    };

    document.addEventListener("wheel", panFunction);
    return () => {
      document.removeEventListener("wheel", panFunction);
    };
  }, [panOffset, setPanOffset]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      redrawCanvas();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [setDimensions, redrawCanvas]);

  // Handle zoom changes
  useEffect(() => {
    const handleZoom = () => {
      redrawCanvas();
    };

    // Listen for zoom changes using the devicePixelRatio
    let lastZoom = window.devicePixelRatio;
    const checkZoom = () => {
      const currentZoom = window.devicePixelRatio;
      if (currentZoom !== lastZoom) {
        lastZoom = currentZoom;
        handleZoom();
      }
    };

    // Check for zoom changes periodically
    const zoomInterval = setInterval(checkZoom, 100);

    return () => {
      clearInterval(zoomInterval);
    };
  }, [redrawCanvas]);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (action === Action.Writing && textArea) {
      setTimeout(() => {
        textArea.focus();
        textArea.value = activeElement?.text || "";
        textArea.style.color = activeElement?.color || color;
      }, 0);
    }
  }, [action, activeElement, color]);

  useEffect(() => {
    if (selectedElement && tool !== TypesTools.Selection) {
      setSelectedElement(null);
    }
  }, [setSelectedElement, selectedElement, tool]);

  const updateElement = (
    id: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: TypesTools,
    options?: { text?: string }
  ) => {
    const elementsCopy = [...elements];
    const index = elementsCopy.findIndex((e) => e.id === id);
    switch (type) {
      case TypesTools.Line:
      case TypesTools.Rectangle:
      case TypesTools.Circle:
        elementsCopy[index] = createElement(
          id,
          x1,
          y1,
          x2,
          y2,
          type,
          elementsCopy[index].color,
          undefined,
          elementsCopy[index].initialCoordinates
        );
        break;
      case TypesTools.Image:
        elementsCopy[index] = createElement(
          id,
          x1,
          y1,
          x2,
          y2,
          type,
          undefined,
          elementsCopy[index].src
        );
        break;
      case TypesTools.Pencil:
        elementsCopy[index].points = [
          ...elementsCopy[index].points!,
          { x: x2, y: y2 },
        ];
        break;
      case TypesTools.Arrow:
        elementsCopy[index] = createElement(
          id,
          x1,
          y1,
          x2,
          y2,
          type,
          elementsCopy[index].color
        );
        break;
      case TypesTools.Text: {
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        context.textBaseline = "top";
        context.font = "26px DeliciousHandrawn-Regular, sans-serif";
        const lines = options?.text?.split("\n");
        // Find longest line
        let textWidth = 0;
        let textHeight = 0;
        lines?.forEach((line) => {
          const lineWidth = context.measureText(line).width;
          if (lineWidth > textWidth) textWidth = lineWidth;
          textHeight += 32;
        });
        elementsCopy[index] = {
          ...createElement(
            id,
            x1,
            y1,
            x1 + textWidth,
            y1 + textHeight,
            type,
            elementsCopy[index].color
          ),
          text: options?.text,
        };
        break;
      }
      default:
        throw new Error(`Type not recognized: ${type}`);
    }
    setElements(elementsCopy, true);
  };

  const onSaveCanvas = () => {
    const PADDING = 30;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true })!;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    elements.forEach((e) => {
      if (e.type === TypesTools.Pencil) {
        const stokeBounds = getStrokeBounds(e.points!);
        if (stokeBounds.minX < minX) minX = stokeBounds.minX;
        if (stokeBounds.minY < minY) minY = stokeBounds.minY;
        if (stokeBounds.maxX > maxX) maxX = stokeBounds.maxX;
        if (stokeBounds.maxY > maxY) maxY = stokeBounds.maxY;
      } else {
        if (e.x1! < minX) minX = e.x1!;
        if (e.y1! < minY) minY = e.y1!;
        if (e.x2! > maxX) maxX = e.x2!;
        if (e.y2! > maxY) maxY = e.y2!;
      }
    });

    const width = maxX - minX + PADDING * 2;
    const height = maxY - minY + PADDING * 2;

    const dpr = window.devicePixelRatio;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);

    const isDarkTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    // Get background color based on theme
    const bgColor = isDarkTheme ? "#242424" : "#ffffff";

    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    //*****/

    const elementsNormalized = elements.map((element) => {
      //  Make each element start at 0,0 using the minX and minY
      if (
        [TypesTools.Pencil, TypesTools.Image, TypesTools.Text].includes(
          element.type
        )
      ) {
        return {
          ...element,
          x1: element.x1! - minX + PADDING,
          y1: element.y1! - minY + PADDING,
          x2: element.x2! - minX + PADDING,
          y2: element.y2! - minY + PADDING,
          points: element.points?.map((point) => ({
            x: point.x - minX + PADDING,
            y: point.y - minY + PADDING,
          })),
        };
      } else {
        return createElement(
          element.id,
          element.x1! - minX + PADDING,
          element.y1! - minY + PADDING,
          element.x2! - minX + PADDING,
          element.y2! - minY + PADDING,
          element.type,
          element.color,
          element.src,
          element.initialCoordinates
        );
      }
    });

    const roughCanvas = rough.canvas(canvas);

    elementsNormalized.forEach((element) => {
      drawElement(
        roughCanvas,
        context,
        element,
        pendingEraseIds,
        selectedElement
      );
    });

    //*****/

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "freedraw.png";
    link.click();
  };
  useKeyboard(onSaveCanvas);

  const getMouseCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate coordinates relative to the canvas
    const clientX = event.clientX - rect.left - panOffset.x;
    const clientY = event.clientY - rect.top - panOffset.y;
    return { clientX, clientY };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    const element = getElementAtPosition(clientX, clientY, elements);
    if (action === Action.Writing) return;
    if (action === Action.PickingColor) return;

    if (tool === TypesTools.Eraser) {
      setAction(Action.Erasing);
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element && !pendingEraseIds.includes(element.id)) {
        setPendingEraseIds([...pendingEraseIds, element.id]);
      }
      return;
    }

    if (event.button === 1 || pressedKeys.has(" ")) {
      setAction(Action.Panning);
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }

    if (tool === TypesTools.Text && element) {
      const offsetX = clientX - element.x1!;
      const offsetY = clientY - element.y1!;
      setActiveElement({ ...element, offsetX, offsetY });
      setAction(Action.Writing);
      return;
    }

    if (tool === TypesTools.Selection) {
      if (element) {
        setSelectedElement(element);
        if (element.type === TypesTools.Pencil) {
          const xOffsets =
            element.points?.map((point) => clientX - point.x) || [];
          const yOffsets =
            element.points?.map((point) => clientY - point.y) || [];
          setActiveElement({ ...element, xOffsets, yOffsets });
        } else {
          const offsetX = clientX - element.x1!;
          const offsetY = clientY - element.y1!;
          setActiveElement({ ...element, offsetX, offsetY });
        }
        setElements((prevState) => prevState);

        if (element.position === ElementPosition.Inside) {
          setAction(Action.Moving);
        } else {
          setAction(Action.Resizing);
        }
      } else {
        setSelectedElement(null);
      }
    } else {
      const id = getRandomId();
      const element = createElement(
        id,
        clientX,
        clientY - (tool === TypesTools.Text ? 28 / 2 : 0),
        clientX,
        clientY - (tool === TypesTools.Text ? 28 / 2 : 0),
        tool,
        color,
        undefined,
        {
          x1: clientX,
          y1: clientY,
        }
      );
      setElements((prevState) => [...prevState, element]);
      setActiveElement(element);

      setAction(tool === TypesTools.Text ? Action.Writing : Action.Drawing);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (action === Action.Panning) {
      const deltaX = clientX - startPanMousePosition.x;
      const deltaY = clientY - startPanMousePosition.y;
      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      });
      return;
    }

    if (tool === TypesTools.Selection) {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (event.target instanceof HTMLElement) {
        event.target.style.cursor =
          element && element.position
            ? cursorForPosition(element.position)
            : "default";
      }
    }

    if (action === Action.Erasing) {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element && !pendingEraseIds.includes(element.id)) {
        setPendingEraseIds([...pendingEraseIds, element.id]);
      }
    }

    if (action === Action.Drawing) {
      const index = elements.length - 1;
      const { id, x1, y1, initialCoordinates } = elements[index];
      updateElement(
        id,
        initialCoordinates?.x1 || x1!,
        initialCoordinates?.y1 || y1!,
        clientX,
        clientY,
        tool
      );
    } else if (action === Action.Moving) {
      if (activeElement?.type === TypesTools.Pencil) {
        const newPoints = activeElement.points?.map((_, index) => ({
          x: clientX - (activeElement.xOffsets?.[index] || 0),
          y: clientY - (activeElement.yOffsets?.[index] || 0),
        }));
        const elementsCopy = [...elements];
        const elementId = elementsCopy.findIndex(
          (e) => e.id === activeElement.id
        );
        elementsCopy[elementId] = {
          ...elementsCopy[elementId],
          points: newPoints,
        };
        setElements(elementsCopy, true);
      } else {
        if (!activeElement) return;
        const { id, x1, x2, y1, y2, type, offsetX, offsetY } = activeElement;
        const width = x2! - x1!;
        const height = y2! - y1!;
        const newX1 = clientX - (offsetX || 0);
        const newY1 = clientY - (offsetY || 0);
        const options =
          type === TypesTools.Text ? { text: activeElement?.text } : {};
        updateElement(
          id,
          newX1,
          newY1,
          newX1 + width,
          newY1 + height,
          type,
          options
        );
      }
    } else if (action === Action.Resizing) {
      if (!activeElement) return;
      const { id, type, position, ...coordinates } = activeElement;
      const { x1, y1, x2, y2 } = resizedCoordinates(
        clientX,
        clientY,
        position!,
        {
          x1: coordinates.x1!,
          y1: coordinates.y1!,
          x2: coordinates.x2!,
          y2: coordinates.y2!,
        },
        type === TypesTools.Image
      );
      updateElement(id, x1, y1, x2, y2, type);
    }
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (activeElement) {
      if (
        activeElement.type === TypesTools.Text &&
        clientX - (activeElement.offsetX || 0) === activeElement.x1 &&
        clientY - (activeElement.offsetY || 0) === activeElement.y1
      ) {
        setAction(Action.Writing);
        return;
      }

      const element = elements.find((e) => e.id === activeElement.id);
      if (!element) return;
      const { id, type } = element;
      if (
        (action === Action.Drawing || action === Action.Resizing) &&
        adjustmentRequired(type)
      ) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(element);
        updateElement(id, x1!, y1!, x2!, y2!, type);
      }
    }

    if (action === Action.Writing) return;

    if (action === Action.Erasing) {
      setElements((prevState) =>
        prevState.filter((e) => !pendingEraseIds.includes(e.id))
      );
      setPendingEraseIds([]);
      setAction(Action.None);
      setActiveElement(null);
      return;
    }

    setAction(Action.None);

    const el = elements.find((e) => e.id === activeElement?.id);
    if (el && shouldDeleteElement(el)) {
      undo();
    }
    setActiveElement(null);
  };

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!activeElement) return;
    const { id, x1, y1, type } = activeElement;
    setAction(Action.None);
    if (event.target.value === "") {
      undo();
    } else {
      updateElement(id, x1!, y1!, 0, 0, type, { text: event.target.value });
    }
    setActiveElement(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).blur();
    }
  };

  const handleMouseEnter = () => {
    updateCursor(tool);
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseUp(event);
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.style.cursor = "default";
  };

  return (
    <div style={{ width: dimensions.width, height: dimensions.height }}>
      {action === Action.Writing && (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            top: (activeElement?.y1 || 0) + panOffset.y,
            left: (activeElement?.x1 || 0) + panOffset.x,
            color,
          }}
          className="text-area fixed text-2xl font-sans m-0 p-0 border-0 outline-none resize-both overflow-hidden whitespace-pre bg-transparent z-[2]"
        />
      )}
      <canvas
        id="canvas"
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute z-[1]"
        onContextMenu={(e) => e.preventDefault()}
      />
      <Toolbar onSaveCanvas={onSaveCanvas} />
    </div>
  );
};

export default App;
