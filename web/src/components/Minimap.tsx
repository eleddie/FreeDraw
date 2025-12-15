import React, { useRef, useEffect, useCallback } from "react";
import { Element, TypesTools } from "../types";
import { getStrokeBounds, getSvgPathFromStroke } from "../utils";
import getStroke from "perfect-freehand";

interface MinimapProps {
  elements: Element[];
  panOffset: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_PADDING = 20;

const Minimap: React.FC<MinimapProps> = ({
  elements,
  panOffset,
  viewportWidth,
  viewportHeight,
  onNavigate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate the bounds of all elements
  const getContentBounds = useCallback(() => {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, maxX: viewportWidth, maxY: viewportHeight };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((element) => {
      if (element.type === TypesTools.Pencil && element.points) {
        const bounds = getStrokeBounds(element.points);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      } else {
        minX = Math.min(minX, element.x1!, element.x2!);
        minY = Math.min(minY, element.y1!, element.y2!);
        maxX = Math.max(maxX, element.x1!, element.x2!);
        maxY = Math.max(maxY, element.y1!, element.y2!);
      }
    });

    // Include the current viewport in the bounds
    const viewMinX = -panOffset.x;
    const viewMinY = -panOffset.y;
    const viewMaxX = -panOffset.x + viewportWidth;
    const viewMaxY = -panOffset.y + viewportHeight;

    minX = Math.min(minX, viewMinX);
    minY = Math.min(minY, viewMinY);
    maxX = Math.max(maxX, viewMaxX);
    maxY = Math.max(maxY, viewMaxY);

    return { minX, minY, maxX, maxY };
  }, [elements, panOffset, viewportWidth, viewportHeight]);

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    context.scale(dpr, dpr);

    // Background
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    context.fillStyle = isDark
      ? "rgba(36, 36, 36, 0.9)"
      : "rgba(255, 255, 255, 0.9)";
    context.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Border
    context.strokeStyle = isDark
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(0, 0, 0, 0.2)";
    context.lineWidth = 1;
    context.strokeRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    const { minX, minY, maxX, maxY } = getContentBounds();
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate scale to fit content in minimap
    const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / contentWidth;
    const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

    // Center offset
    const offsetX =
      MINIMAP_PADDING +
      (MINIMAP_WIDTH - MINIMAP_PADDING * 2 - contentWidth * scale) / 2;
    const offsetY =
      MINIMAP_PADDING +
      (MINIMAP_HEIGHT - MINIMAP_PADDING * 2 - contentHeight * scale) / 2;

    // Transform functions
    const transformX = (x: number) => (x - minX) * scale + offsetX;
    const transformY = (y: number) => (y - minY) * scale + offsetY;

    // Draw elements
    const defaultColor = isDark ? "#ffffff" : "#000000";

    elements.forEach((element) => {
      const color = element.color || defaultColor;
      context.fillStyle = color;
      context.strokeStyle = color;

      switch (element.type) {
        case TypesTools.Pencil: {
          if (!element.points || element.points.length < 2) break;
          const scaledPoints = element.points.map((p) => ({
            x: transformX(p.x),
            y: transformY(p.y),
          }));
          const stroke = getSvgPathFromStroke(
            getStroke(scaledPoints, {
              size: Math.max(1, 4 * scale),
              thinning: 0.5,
              smoothing: 0.5,
              streamline: 0.5,
            })
          );
          context.fill(new Path2D(stroke));
          break;
        }
        case TypesTools.Line:
        case TypesTools.Arrow: {
          context.beginPath();
          context.moveTo(transformX(element.x1!), transformY(element.y1!));
          context.lineTo(transformX(element.x2!), transformY(element.y2!));
          context.lineWidth = Math.max(0.5, 1.5 * scale);
          context.stroke();
          break;
        }
        case TypesTools.Rectangle: {
          const x = transformX(Math.min(element.x1!, element.x2!));
          const y = transformY(Math.min(element.y1!, element.y2!));
          const w = Math.abs(element.x2! - element.x1!) * scale;
          const h = Math.abs(element.y2! - element.y1!) * scale;
          context.lineWidth = Math.max(0.5, 1.5 * scale);
          context.strokeRect(x, y, w, h);
          break;
        }
        case TypesTools.Circle: {
          const cx = transformX(element.x1! + (element.x2! - element.x1!) / 2);
          const cy = transformY(element.y1! + (element.y2! - element.y1!) / 2);
          const r = (Math.abs(element.x2! - element.x1!) / 2) * scale;
          context.beginPath();
          context.arc(cx, cy, r, 0, Math.PI * 2);
          context.lineWidth = Math.max(0.5, 1.5 * scale);
          context.stroke();
          break;
        }
        case TypesTools.Text: {
          // Draw text as a small rectangle placeholder
          const x = transformX(element.x1!);
          const y = transformY(element.y1!);
          const w = (element.x2! - element.x1!) * scale;
          const h = (element.y2! - element.y1!) * scale;
          if (w > 2 && h > 2) {
            context.fillStyle = isDark
              ? "rgba(255, 255, 255, 0.3)"
              : "rgba(0, 0, 0, 0.3)";
            context.fillRect(x, y, w, h);
          }
          break;
        }
        case TypesTools.Image: {
          const x = transformX(element.x1!);
          const y = transformY(element.y1!);
          const w = (element.x2! - element.x1!) * scale;
          const h = (element.y2! - element.y1!) * scale;
          context.fillStyle = isDark
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(0, 0, 0, 0.2)";
          context.fillRect(x, y, w, h);
          context.strokeStyle = isDark
            ? "rgba(255, 255, 255, 0.4)"
            : "rgba(0, 0, 0, 0.4)";
          context.lineWidth = 1;
          context.strokeRect(x, y, w, h);
          break;
        }
      }
    });

    // Draw viewport indicator
    const viewX = transformX(-panOffset.x);
    const viewY = transformY(-panOffset.y);
    const viewW = viewportWidth * scale;
    const viewH = viewportHeight * scale;

    context.strokeStyle = isDark
      ? "rgba(100, 150, 255, 0.8)"
      : "rgba(50, 100, 200, 0.8)";
    context.lineWidth = 2;
    context.strokeRect(viewX, viewY, viewW, viewH);

    context.fillStyle = isDark
      ? "rgba(100, 150, 255, 0.1)"
      : "rgba(50, 100, 200, 0.1)";
    context.fillRect(viewX, viewY, viewW, viewH);
  }, [elements, panOffset, viewportWidth, viewportHeight, getContentBounds]);

  useEffect(() => {
    drawMinimap();
  }, [drawMinimap]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minX, minY, maxX, maxY } = getContentBounds();
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / contentWidth;
    const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX =
      MINIMAP_PADDING +
      (MINIMAP_WIDTH - MINIMAP_PADDING * 2 - contentWidth * scale) / 2;
    const offsetY =
      MINIMAP_PADDING +
      (MINIMAP_HEIGHT - MINIMAP_PADDING * 2 - contentHeight * scale) / 2;

    // Convert click position to canvas coordinates
    const canvasX = (clickX - offsetX) / scale + minX;
    const canvasY = (clickY - offsetY) / scale + minY;

    // Center the viewport on the clicked position
    const newPanX = -(canvasX - viewportWidth / 2);
    const newPanY = -(canvasY - viewportHeight / 2);

    onNavigate(newPanX, newPanY);
  };

  return (
    <canvas
      ref={canvasRef}
      className="minimap"
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      onClick={handleClick}
      style={{
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
      }}
    />
  );
};

export default Minimap;
