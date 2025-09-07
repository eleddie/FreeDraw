import { Drawable } from "roughjs/bin/core";

export enum TypesTools {
  Selection = "selection",
  Eraser = "eraser",
  Pencil = "pencil",
  Line = "line",
  Rectangle = "rectangle",
  Circle = "circle",
  Text = "text",
  Image = "image",
  Arrow = "arrow",
}

export type ElementType = TypesTools;

export type Element = {
  id: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  type: TypesTools;
  text?: string;
  src?: string;
  points?: { x: number; y: number }[];
  roughElement?: Drawable | Drawable[];
  xOffsets?: number[];
  yOffsets?: number[];
  offsetX?: number;
  offsetY?: number;
  position?: string | null;
  color?: string;
  initialCoordinates?: { x1: number; y1: number };
};

export enum Action {
  None = "none",
  Drawing = "drawing",
  Moving = "moving",
  Resizing = "resizing",
  Selecting = "selecting",
  Writing = "writing",
  Panning = "panning",
  PickingColor = "pickingColor",
  Erasing = "erasing",
}

export enum ElementPosition {
  Inside = "inside",
  Outside = "outside",
}
