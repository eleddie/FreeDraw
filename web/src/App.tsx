import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState,
} from "react";
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
  loadFont,
} from "./utils";
import Toolbar from "./components/Toolbar";
import LoadingScreen from "./components/LoadingScreen";
import Minimap from "./components/Minimap";
import useAppState from "./store/state";
import { useHistory } from "./hooks/useHistory";
import { Action, ElementPosition, Element, TypesTools } from "./types";
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
    selectedElements,
    setSelectedElements,
    panOffset,
    setPanOffset,
    startPanMousePosition,
    setStartPanMousePosition,
    pendingEraseIds,
    setPendingEraseIds,
    dimensions,
    setDimensions,
    isInitialized,
    setIsInitialized,
  } = useAppState();

  const { elements, setElements, undo } = useHistory();
  const [isAppReady, setIsAppReady] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const pressedKeys = usePressedKeys();
  const multiMoveStart = useRef<{ x: number; y: number } | null>(null);
  const selectionBox = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const selectionStart = useRef<Element[]>([]);

  // Load font on component mount and set app ready state
  useEffect(() => {
    const loadAppFont = async () => {
      try {
        await loadFont("DeliciousHandrawn-Regular");
        setIsAppReady(true);
      } catch (error) {
        console.warn("Failed to load font, proceeding with fallback:", error);
        setIsAppReady(true);
      }
    };

    loadAppFont();
  }, []);

  useEffect(() => {
    if (isInitialized) return;
    const saved = localStorage.getItem("freedraw-elements");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setElements(parsed);
        }
      } catch {
        // ignore parse errors
      }
    }

    const savedPanOffset = localStorage.getItem("freedraw-pan-offset");
    if (savedPanOffset) {
      try {
        const parsedPanOffset = JSON.parse(savedPanOffset);
        if (
          parsedPanOffset &&
          typeof parsedPanOffset.x === "number" &&
          typeof parsedPanOffset.y === "number"
        ) {
          setPanOffset(parsedPanOffset);
        }
      } catch {
        // ignore parse errors
      }
    }

    setIsInitialized(true);
  }, [elements, isInitialized, setIsInitialized, setElements, setPanOffset]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("freedraw-elements", JSON.stringify(elements));
  }, [elements, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("freedraw-pan-offset", JSON.stringify(panOffset));
  }, [panOffset, isInitialized]);

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
          selectedElements
        );
      });

      if (action === Action.Selecting && selectionBox.current) {
        const { x1, y1, x2, y2 } = selectionBox.current;
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        const defaultColor = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "#ffffff"
          : "#000000";
        context.strokeStyle = defaultColor;
        context.setLineDash([5, 5]);
        context.strokeRect(rx, ry, rw, rh);
        context.setLineDash([]);
      }
      context.restore();
    },
    [
      elements,
      action,
      activeElement,
      panOffset,
      pendingEraseIds,
      selectedElements,
    ]
  );

  const redrawCanvas = useCallback(() => {
    if (!isAppReady) return; // Don't render until app is ready
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const { width, height } = scaleCanvas(canvas, context);
    drawAllElements(canvas, context, width, height);
  }, [drawAllElements, isAppReady]);

  useLayoutEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Redraw canvas when app becomes ready
  useEffect(() => {
    if (isAppReady && isInitialized) {
      redrawCanvas();
    }
  }, [isAppReady, isInitialized, redrawCanvas]);

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
    if (selectedElements.length && tool !== TypesTools.Selection) {
      setSelectedElements([]);
    }
  }, [setSelectedElements, selectedElements, tool]);

  const getElementBounds = (element: Element) => {
    if (element.type === TypesTools.Pencil) {
      const { minX, minY, maxX, maxY } = getStrokeBounds(element.points!);
      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
    }
    return {
      x1: Math.min(element.x1!, element.x2!),
      y1: Math.min(element.y1!, element.y2!),
      x2: Math.max(element.x1!, element.x2!),
      y2: Math.max(element.y1!, element.y2!),
    };
  };

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
    let updated: Element | null = null;
    switch (type) {
      case TypesTools.Line:
      case TypesTools.Rectangle:
      case TypesTools.Circle:
        updated = createElement(
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
        elementsCopy[index] = updated;
        break;
      case TypesTools.Image:
        updated = createElement(
          id,
          x1,
          y1,
          x2,
          y2,
          type,
          undefined,
          elementsCopy[index].src
        );
        elementsCopy[index] = updated;
        break;
      case TypesTools.Pencil:
        elementsCopy[index].points = [
          ...elementsCopy[index].points!,
          { x: x2, y: y2 },
        ];
        updated = elementsCopy[index];
        break;
      case TypesTools.Arrow:
        updated = createElement(
          id,
          x1,
          y1,
          x2,
          y2,
          type,
          elementsCopy[index].color
        );
        elementsCopy[index] = updated;
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
        updated = {
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
        elementsCopy[index] = updated;
        break;
      }
      default:
        throw new Error(`Type not recognized: ${type}`);
    }
    setElements(elementsCopy, true);
    if (updated && selectedElements.some((el) => el.id === id)) {
      const nextSelectedElements = selectedElements.map((el) =>
        el.id === id ? updated! : el
      );
      setSelectedElements(nextSelectedElements);
    }
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
        selectedElements
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
        if (pressedKeys.has("Shift")) {
          const alreadySelected = selectedElements.some(
            (el) => el.id === element.id
          );
          if (alreadySelected) {
            setSelectedElements(
              selectedElements.filter((el) => el.id !== element.id)
            );
          } else {
            setSelectedElements([...selectedElements, element]);
          }
          return;
        }

        const alreadySelected = selectedElements.some(
          (el) => el.id === element.id
        );
        let newSelected = selectedElements;
        if (!alreadySelected) {
          newSelected = [element];
          setSelectedElements(newSelected);
        }

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
          if (newSelected.length > 1) {
            multiMoveStart.current = { x: clientX, y: clientY };
          }
          setAction(Action.Moving);
        } else if (newSelected.length === 1) {
          setAction(Action.Resizing);
        }
      } else {
        if (!pressedKeys.has("Shift")) {
          setSelectedElements([]);
          selectionStart.current = [];
        } else {
          selectionStart.current = selectedElements;
        }
        selectionBox.current = {
          x1: clientX,
          y1: clientY,
          x2: clientX,
          y2: clientY,
        };
        setAction(Action.Selecting);
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

    if (action === Action.Selecting) {
      if (selectionBox.current) {
        selectionBox.current.x2 = clientX;
        selectionBox.current.y2 = clientY;
        const { x1, y1, x2, y2 } = selectionBox.current;
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        const within = elements.filter((el) => {
          const bounds = getElementBounds(el);
          return (
            bounds.x1 >= minX &&
            bounds.y1 >= minY &&
            bounds.x2 <= maxX &&
            bounds.y2 <= maxY
          );
        });
        const base = [...selectionStart.current];
        within.forEach((el) => {
          if (!base.some((sel) => sel.id === el.id)) base.push(el);
        });
        setSelectedElements(base);
      }
      redrawCanvas();
      return;
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
      if (selectedElements.length > 1) {
        if (multiMoveStart.current) {
          const deltaX = clientX - multiMoveStart.current.x;
          const deltaY = clientY - multiMoveStart.current.y;
          multiMoveStart.current = { x: clientX, y: clientY };
          const elementsCopy = elements.map((el) => {
            if (!selectedElements.some((sel) => sel.id === el.id)) return el;
            if (el.type === TypesTools.Pencil) {
              const newPoints = el.points?.map((p) => ({
                x: p.x + deltaX,
                y: p.y + deltaY,
              }));
              return {
                ...el,
                points: newPoints,
                x1: el.x1! + deltaX,
                y1: el.y1! + deltaY,
                x2: el.x2! + deltaX,
                y2: el.y2! + deltaY,
              };
            }
            if (
              [
                TypesTools.Line,
                TypesTools.Rectangle,
                TypesTools.Circle,
                TypesTools.Arrow,
              ].includes(el.type)
            ) {
              return createElement(
                el.id,
                el.x1! + deltaX,
                el.y1! + deltaY,
                el.x2! + deltaX,
                el.y2! + deltaY,
                el.type,
                el.color,
                el.src,
                el.initialCoordinates
              );
            }
            return {
              ...el,
              x1: el.x1! + deltaX,
              y1: el.y1! + deltaY,
              x2: el.x2! + deltaX,
              y2: el.y2! + deltaY,
            };
          });
          setElements(elementsCopy, true);
          const nextSelectedElements = selectedElements.map(
            (sel) => elementsCopy.find((el) => el.id === sel.id) || sel
          );
          setSelectedElements(nextSelectedElements);
        }
      } else if (activeElement?.type === TypesTools.Pencil) {
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
        const nextSelectedElements = selectedElements.map((sel) =>
          sel.id === activeElement.id ? elementsCopy[elementId] : sel
        );
        setSelectedElements(nextSelectedElements);
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
    if (action === Action.Selecting) {
      if (selectionBox.current) {
        const { x1, y1, x2, y2 } = selectionBox.current;
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        const within = elements.filter((el) => {
          const bounds = getElementBounds(el);
          return (
            bounds.x1 >= minX &&
            bounds.y1 >= minY &&
            bounds.x2 <= maxX &&
            bounds.y2 <= maxY
          );
        });
        const base = [...selectionStart.current];
        within.forEach((el) => {
          if (!base.some((sel) => sel.id === el.id)) base.push(el);
        });
        setSelectedElements(base);
      }
      selectionBox.current = null;
      selectionStart.current = [];
      redrawCanvas();
      setAction(Action.None);
      return;
    }
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
    multiMoveStart.current = null;

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

  // Show loading screen while font is loading
  if (!isAppReady) {
    return (
      <LoadingScreen width={dimensions.width} height={dimensions.height} />
    );
  }

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
      <Minimap
        elements={elements}
        panOffset={panOffset}
        viewportWidth={dimensions.width}
        viewportHeight={dimensions.height}
        onNavigate={(x, y) => setPanOffset({ x, y })}
      />
    </div>
  );
};

export default App;
