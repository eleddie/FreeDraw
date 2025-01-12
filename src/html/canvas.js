const root = document.documentElement;
const getColor = (color) => getComputedStyle(root).getPropertyValue(color);
const primaryColor = getColor("--primary-color");
const backgroundColor = getColor("--secondary-color");
const dotsColor = getColor("--tertiary-color");

const sizeSliderContainer = document.getElementById("sizeSliderContainer");
const circleCursor = document.getElementById("circleCursor");
const outerCircle = document.getElementById("outerCircle");
const innerCircle = document.getElementById("innerCircle");
const sizeSlider = document.getElementById("sizeSlider");
const canvas = document.getElementById("drawCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const colorPicker = document.getElementById("colorPicker");
const selectionRectangle = document.getElementById("selectionRectangle");

const shapeButtons = {
  rectangle: document.getElementById("rectangleButton"),
  circle: document.getElementById("circleButton"),
  arrow: document.getElementById("arrowButton"),
  triangle: document.getElementById("triangleButton"),
};

const State = {
  DRAW: "DRAW",
  ERASE: "ERASE",
  SELECT: "SELECT",
  MOVE: "MOVE",
};

const Shapes = {
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  ARROW: "arrow",
  TRIANGLE: "triangle",
};

let currentState = {
  mode: State.DRAW,
  color: primaryColor,
  penSize: 2,
  eraser: false,
  drawing: false,
  makingSelection: false,
  movingSelection: false,
  selectionStart: null,
  selectionEnd: null,
  selectedImageData: null,
};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Remove background fill from canvas
context.strokeStyle = currentState.color;
context.lineWidth = currentState.penSize;
context.lineCap = "round";
context.lineJoin = "round";

let undoStack = [];
let redoStack = [];
