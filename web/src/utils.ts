import { useState, useEffect } from "react";
import getStroke from "perfect-freehand";
import rough from "roughjs";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Element, ElementType, TypesTools } from "./types";
import { Drawable } from "roughjs/bin/core";
import Color from "color";
import { drawText } from "canvas-txt";
import useAppState from "./store/state";

export const generator = rough.generator();
const MIN_IMAGE_SIZE = 30;

const getRoughOptions = (color: string | undefined) => ({
  stroke: color,
  strokeWidth: 1.8,
  roughness: 1.2,
});

export const createElement = (
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: TypesTools,
  color?: string,
  src?: string
) => {
  switch (type) {
    case TypesTools.Line: {
      const roughElement = generator.line(
        x1,
        y1,
        x2,
        y2,
        getRoughOptions(color)
      );
      return { id, x1, y1, x2, y2, type, roughElement, color };
    }
    case TypesTools.Rectangle: {
      const roughElement = generator.rectangle(
        x1,
        y1,
        x2 - x1,
        y2 - y1,
        getRoughOptions(color)
      );
      return { id, x1, y1, x2, y2, type, roughElement, color };
    }
    case TypesTools.Circle: {
      const centerX = x1 + (x2 - x1) / 2;
      const centerY = y1 + (y2 - y1) / 2;
      const diameter = Math.abs(x2 - x1);

      const realX1 = centerX - diameter / 2;
      const realY1 = centerY - diameter / 2;
      const realX2 = centerX + diameter / 2;
      const realY2 = centerY + diameter / 2;

      const roughElement = generator.circle(
        centerX,
        centerY,
        diameter,
        getRoughOptions(color)
      );
      return {
        id,
        x1: realX1,
        y1: realY1,
        x2: realX2,
        y2: realY2,
        type,
        roughElement,
        color,
      };
    }
    case TypesTools.Arrow: {
      const line = generator.line(x1, y1, x2, y2, getRoughOptions(color));
      const arrowHead1 = generator.line(
        x2,
        y2,
        x2 - 15 * Math.cos(Math.atan2(y2 - y1, x2 - x1) - Math.PI / 6),
        y2 - 15 * Math.sin(Math.atan2(y2 - y1, x2 - x1) - Math.PI / 6),
        getRoughOptions(color)
      );
      const arrowHead2 = generator.line(
        x2,
        y2,
        x2 - 15 * Math.cos(Math.atan2(y2 - y1, x2 - x1) + Math.PI / 6),
        y2 - 10 * Math.sin(Math.atan2(y2 - y1, x2 - x1) + Math.PI / 6),
        getRoughOptions(color)
      );
      const roughElement = [line, arrowHead1, arrowHead2];
      return { id, x1, y1, x2, y2, type, roughElement, color };
    }
    case TypesTools.Image:
      return { id, type, x1, y1, x2, y2, src };
    case TypesTools.Pencil:
      return { id, type, points: [{ x: x1, y: y1 }], x1, y1, x2, y2, color };
    case TypesTools.Text:
      return { id, type, x1, y1, x2, y2, text: "", color };
    default:
      throw new Error(`Type not recognized: ${type}`);
  }
};

export const nearPoint = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  name: string
) => {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
};

export const onLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
  maxDistance = 1
) => {
  const a = { x: x1, y: y1 };
  const b = { x: x2, y: y2 };
  const c = { x, y };
  const offset = distance(a, b) - (distance(a, c) + distance(b, c));
  return Math.abs(offset) < maxDistance ? "inside" : null;
};

export const positionWithinElement = (
  x: number,
  y: number,
  element: Element
) => {
  const { type, x1, x2, y1, y2 } = element;
  switch (type) {
    case TypesTools.Line: {
      const on = onLine(x1!, y1!, x2!, y2!, x, y);
      const start = nearPoint(x, y, x1!, y1!, "start");
      const end = nearPoint(x, y, x2!, y2!, "end");
      return start || end || on;
    }
    case TypesTools.Image:
    case TypesTools.Rectangle: {
      const topLeft = nearPoint(x, y, x1!, y1!, "tl");
      const topRight = nearPoint(x, y, x2!, y1!, "tr");
      const bottomLeft = nearPoint(x, y, x1!, y2!, "bl");
      const bottomRight = nearPoint(x, y, x2!, y2!, "br");
      const inside =
        x >= x1! && x <= x2! && y >= y1! && y <= y2! ? "inside" : null;
      return topLeft || topRight || bottomLeft || bottomRight || inside;
    }
    case TypesTools.Circle: {
      const radius = Math.sqrt((x2! - x1!) ** 2 + (y2! - y1!) ** 2) / 2;
      const centerX = x1! + (x2! - x1!) / 2;
      const centerY = y1! + (y2! - y1!) / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      return distance <= radius ? "inside" : null;
    }
    case TypesTools.Arrow: {
      const on = onLine(x1!, y1!, x2!, y2!, x, y);
      const start = nearPoint(x, y, x1!, y1!, "start");
      const end = nearPoint(x, y, x2!, y2!, "end");
      return start || end || on;
    }
    case TypesTools.Pencil: {
      const betweenAnyPoint = element.points!.some((point, index) => {
        const nextPoint = element.points![index + 1];
        if (!nextPoint) return false;
        return (
          onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null
        );
      });
      return betweenAnyPoint ? "inside" : null;
    }
    case TypesTools.Text:
      return x >= x1! && x <= x2! && y >= y1! && y <= y2! ? "inside" : null;
    default:
      throw new Error(`Type not recognized: ${type}`);
  }
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

export const getElementAtPosition = (
  x: number,
  y: number,
  elements: Array<Element>
) => {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .reverse()
    .find((element) => element.position !== null);
};

export const adjustElementCoordinates = (element: Element) => {
  const { type, x1, y1, x2, y2 } = element;
  if (type === TypesTools.Rectangle) {
    const minX = Math.min(x1!, x2!);
    const maxX = Math.max(x1!, x2!);
    const minY = Math.min(y1!, y2!);
    const maxY = Math.max(y1!, y2!);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  } else {
    if (x1! < x2! || (x1! === x2! && y1! < y2!)) {
      return { x1, y1, x2, y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }
};

export const cursorForPosition = (position: string) => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    default:
      return "move";
  }
};

const calculateAspectRatioAdjustment = (
  originalWidth: number,
  originalHeight: number,
  newWidth: number,
  newHeight: number
) => {
  const ratio = originalWidth / originalHeight;
  if (Math.abs(newWidth) > Math.abs(newHeight * ratio)) {
    const adjustedHeight = newWidth / ratio;
    return { width: newWidth, height: adjustedHeight };
  } else {
    const adjustedWidth = newHeight * ratio;
    return { width: adjustedWidth, height: newHeight };
  }
};

const ensureMinSize = (
  position: string,
  coords: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
) => {
  const width = Math.abs(coords.x2 - coords.x1);
  const height = Math.abs(coords.y2 - coords.y1);

  if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) {
    if (position.includes("r")) {
      // Right side handles
      coords.x2 =
        coords.x1 +
        (coords.x2 >= coords.x1
          ? Math.max(MIN_IMAGE_SIZE, width)
          : -Math.max(MIN_IMAGE_SIZE, width));
    } else if (position.includes("l")) {
      // Left side handles
      coords.x1 =
        coords.x2 -
        (coords.x2 >= coords.x1
          ? Math.max(MIN_IMAGE_SIZE, width)
          : -Math.max(MIN_IMAGE_SIZE, width));
    }

    if (position.includes("b")) {
      // Bottom handles
      coords.y2 =
        coords.y1 +
        (coords.y2 >= coords.y1
          ? Math.max(MIN_IMAGE_SIZE, height)
          : -Math.max(MIN_IMAGE_SIZE, height));
    } else if (position.includes("t")) {
      // Top handles
      coords.y1 =
        coords.y2 -
        (coords.y2 >= coords.y1
          ? Math.max(MIN_IMAGE_SIZE, height)
          : -Math.max(MIN_IMAGE_SIZE, height));
    }
  }
  return coords;
};

export const resizedCoordinates = (
  clientX: number,
  clientY: number,
  position: string,
  coordinates: { x1: number; y1: number; x2: number; y2: number },
  maintainAspectRatio = false
) => {
  const { x1, y1, x2, y2 } = coordinates;

  let result;
  switch (position) {
    case "tl":
    case "start": {
      if (maintainAspectRatio) {
        const { width, height } = calculateAspectRatioAdjustment(
          x2 - x1,
          y2 - y1,
          x2 - clientX,
          y2 - clientY
        );
        result = { x1: x2 - width, y1: y2 - height, x2, y2 };
        if (width < 0) {
          [result.x1, result.x2] = [result.x2, result.x1];
        }
        if (height < 0) {
          [result.y1, result.y2] = [result.y2, result.y1];
        }
      } else {
        result = { x1: clientX, y1: clientY, x2, y2 };
      }
      return ensureMinSize(position, result);
    }
    case "tr": {
      if (maintainAspectRatio) {
        const { width, height } = calculateAspectRatioAdjustment(
          x2 - x1,
          y2 - y1,
          clientX - x1,
          y2 - clientY
        );
        result = { x1, y1: y2 - height, x2: x1 + width, y2 };
        if (width < 0) {
          [result.x1, result.x2] = [result.x2, result.x1];
        }
        if (height < 0) {
          [result.y1, result.y2] = [result.y2, result.y1];
        }
      } else {
        result = { x1, y1: clientY, x2: clientX, y2 };
      }
      return ensureMinSize(position, result);
    }
    case "bl": {
      if (maintainAspectRatio) {
        const { width, height } = calculateAspectRatioAdjustment(
          x2 - x1,
          y2 - y1,
          x2 - clientX,
          clientY - y1
        );
        result = { x1: x2 - width, y1, x2, y2: y1 + height };
        if (width < 0) {
          [result.x1, result.x2] = [result.x2, result.x1];
        }
        if (height < 0) {
          [result.y1, result.y2] = [result.y2, result.y1];
        }
      } else {
        result = { x1: clientX, y1, x2, y2: clientY };
      }
      return ensureMinSize(position, result);
    }
    case "br":
    case "end": {
      if (maintainAspectRatio) {
        const { width, height } = calculateAspectRatioAdjustment(
          x2 - x1,
          y2 - y1,
          clientX - x1,
          clientY - y1
        );
        result = { x1, y1, x2: x1 + width, y2: y1 + height };
        if (width < 0) {
          [result.x1, result.x2] = [result.x2, result.x1];
        }
        if (height < 0) {
          [result.y1, result.y2] = [result.y2, result.y1];
        }
      } else {
        result = { x1, y1, x2: clientX, y2: clientY };
      }
      return ensureMinSize(position, result);
    }
    default:
      return { x1, y1, x2, y2 };
  }
};

const average = (a: number, b: number) => (a + b) / 2;

export function getSvgPathFromStroke(
  points: number[][],
  closed = true
): string {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
}

const drawAnchors = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const padding = 3;
  const size = padding * 2;
  const defaultColor = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "#ffffff"
    : "#000000";
  context.fillStyle = defaultColor;
  // Top left
  context.fillRect(x1 - padding, y1 - padding, size, size);
  // Top right
  context.fillRect(x2 - padding, y1 - padding, size, size);
  // Bottom left
  context.fillRect(x1 - padding, y2 - padding, size, size);
  // Bottom right
  context.fillRect(x2 - padding, y2 - padding, size, size);
};

export const drawElement = (
  roughCanvas: RoughCanvas,
  context: CanvasRenderingContext2D,
  element: Element,
  pendingEraseIds: number[],
  selectedElement: Element | null
) => {
  const isBeingErased = pendingEraseIds.includes(element.id);
  const defaultColor = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "#ffffff"
    : "#000000";

  let color = element.color || defaultColor;
  if (isBeingErased) {
    color = Color(color).alpha(0.5).toString();
  }

  // Draw selection rectangle
  if (selectedElement?.id === element.id) {
    const padding = 3;
    context.save();
    context.strokeStyle = "red";
    context.lineWidth = 1.5;
    context.strokeStyle = defaultColor;
    context.setLineDash([5, 5]);

    let x1 = element.x1! - padding;
    let y1 = element.y1! - padding;
    let x2 = element.x2! + padding;
    let y2 = element.y2! + padding;

    if (element.type === TypesTools.Text) {
      // The selection box bounds are slightly off when the type is text
      // so we need to adjust the coordinates
      y1 = element.y1! - padding * 2;
      y2 = element.y2!;
    }

    if (element.type === TypesTools.Pencil) {
      const { minX, minY, maxX, maxY } = getStrokeBounds(element.points!);
      x1 = minX - padding;
      y1 = minY - padding;
      x2 = maxX + padding;
      y2 = maxY + padding;
    }

    context.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // Draw anchors
    if ([TypesTools.Rectangle, TypesTools.Image].includes(element.type)) {
      drawAnchors(context, x1, y1, x2, y2);
    }
    context.setLineDash([]);
    context.restore();
  }

  context.fillStyle = color;
  context.strokeStyle = color;

  switch (element.type) {
    case TypesTools.Line:
    case TypesTools.Rectangle:
    case TypesTools.Circle: {
      const roughElement = element.roughElement as Drawable;
      if (!roughElement) return;
      roughElement.options.stroke = color;
      roughCanvas.draw(roughElement);
      break;
    }
    case TypesTools.Pencil: {
      const stroke = getSvgPathFromStroke(
        getStroke(element.points || [], {
          size: 4,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
      );
      context.fill(new Path2D(stroke));
      break;
    }
    case TypesTools.Arrow: {
      const roughElement = element.roughElement as Drawable[];
      if (roughElement) {
        roughElement.forEach((roughElement) => {
          roughElement.options.stroke = color;
          roughCanvas.draw(roughElement);
        });
      }
      break;
    }
    case TypesTools.Text:
      context.textBaseline = "top";
      context.textAlign = "center";
      context.font = "24px DeliciousHandrawn-Regular, sans-serif";
      drawText(context, element.text || "", {
        x: element.x1!,
        y: element.y1!,
        width: element.x2! - element.x1!,
        height: element.y2! - element.y1!,
        font: "24px DeliciousHandrawn-Regular, sans-serif",
        lineHeight: 26,
        align: "center",
      });
      break;
    case TypesTools.Image:
      if (element.src) {
        const width = element.x2! - element.x1!;
        const height = element.y2! - element.y1!;
        const image = new Image(width, height);
        image.src = element.src;
        context.save();
        if (isBeingErased) {
          context.globalAlpha = 0.5;
        }
        context.drawImage(image, element.x1!, element.y1!, width, height);
        context.restore();
      }
      break;
    default:
      throw new Error(`Type not recognized: ${element.type}`);
  }
};

export const adjustmentRequired = (type: ElementType) =>
  [TypesTools.Line, TypesTools.Rectangle].includes(type);

export const usePressedKeys = () => {
  const [pressedKeys, setPressedKeys] = useState(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setPressedKeys((prevKeys) => new Set(prevKeys).add(event.key));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setPressedKeys((prevKeys) => {
        const updatedKeys = new Set(prevKeys);
        updatedKeys.delete(event.key);
        return updatedKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return pressedKeys;
};

export function getRandomColor() {
  const isDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
  // Get background color based on theme
  const bgColor = isDarkTheme ? "#242424" : "#ffffff";

  // Generate random colors until we find one with sufficient contrast
  while (true) {
    const randomColor = Color.rgb(
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256)
    );

    // Check contrast ratio against background
    const contrast = Color(randomColor).contrast(Color(bgColor));

    // WCAG AA standard requires contrast of at least 4.5:1
    if (contrast >= 4.5) {
      return randomColor.hex();
    }
  }
}

export function getStrokeBounds(points: { x: number; y: number }[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points?.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, minY, maxX, maxY };
}

// Generate a random id as a number
export function getRandomId() {
  return Math.floor(Math.random() * 1000000);
}

export const updateCursor = (tool: TypesTools) => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (
    [
      TypesTools.Arrow,
      TypesTools.Pencil,
      TypesTools.Line,
      TypesTools.Rectangle,
      TypesTools.Circle,
      TypesTools.Eraser,
    ].includes(tool)
  ) {
    canvas.style.cursor = "crosshair";
  }
  if (tool === TypesTools.Text) {
    canvas.style.cursor = "text";
  }
};

export const scaleCanvas = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) => {
  // Get the DPR and size of the canvas
  const dpr = window.devicePixelRatio;
  const rect = useAppState.getState().dimensions;

  // Set the "actual" size of the canvas
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale the context to ensure correct drawing operations
  context.scale(dpr, dpr);

  // Set the "drawn" size of the canvas
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  return { dpr, width: rect.width, height: rect.height };
};

export const shouldDeleteElement = (element: Element) => {
  const SIZE = 10;
  const { type, x1, y1, x2, y2, text, points } = element;
  switch (type) {
    case TypesTools.Line:
    case TypesTools.Arrow:
      return Math.sqrt((x2! - x1!) ** 2 + (y2! - y1!) ** 2) < SIZE;
    case TypesTools.Rectangle:
      return Math.abs(x2! - x1!) * Math.abs(y2! - y1!) < SIZE ** 2;
    case TypesTools.Circle:
      return x2! - x1! < SIZE;
    case TypesTools.Text:
      return text === "";
    case TypesTools.Pencil:
      return points!.length < 5;
    case TypesTools.Image:
      return x2! - x1! < SIZE || y2! - y1! < SIZE;
    default:
      return false;
  }
};
