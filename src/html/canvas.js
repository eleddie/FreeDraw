const root = document.documentElement;
const getColor = (color) => getComputedStyle(root).getPropertyValue(color);

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

let primaryColor;
let backgroundColor;
let sizeSliderContainer;
let circleCursor;
let outerCircle;
let innerCircle;
let sizeSlider;
let canvas;
let context;
let colorPicker;
let selectionRectangle;
let shapeButtons;
let currentState;
let undoStack;
let redoStack;

window.onload = () => {
  primaryColor = getColor("--primary-color");
  backgroundColor = getColor("--secondary-color");
  sizeSliderContainer = document.getElementById("sizeSliderContainer");
  circleCursor = document.getElementById("circleCursor");
  outerCircle = document.getElementById("outerCircle");
  innerCircle = document.getElementById("innerCircle");
  sizeSlider = document.getElementById("sizeSlider");
  canvas = document.getElementById("drawCanvas");
  context = canvas.getContext("2d", { willReadFrequently: true });
  colorPicker = document.getElementById("colorPicker");
  selectionRectangle = document.getElementById("selectionRectangle");

  shapeButtons = {
    rectangle: document.getElementById("rectangleButton"),
    circle: document.getElementById("circleButton"),
    arrow: document.getElementById("arrowButton"),
    triangle: document.getElementById("triangleButton"),
  };

  currentState = {
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

  undoStack = [];
  redoStack = [];
};
