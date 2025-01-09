const root = document.documentElement;
const getColor = (color) => getComputedStyle(root).getPropertyValue(color);
const foregroundColor = getColor("--primary-color");
const backgroundColor = getColor("--secondary-color");
const dotsColor = getColor("--tertiary-color");

const sizeSliderContainer = document.getElementById("sizeSliderContainer");
const circleCursor = document.getElementById("circleCursor");
const outerCircle = document.getElementById("outerCircle");
const innerCircle = document.getElementById("innerCircle");
const sizeSlider = document.getElementById("sizeSlider");
const canvas = document.getElementById("drawCanvas");
const context = canvas.getContext("2d");

let drawing = false;
let eraser = false;
let penSize = 2;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

context.strokeStyle = foregroundColor;
context.lineWidth = penSize;
context.lineCap = "round";
context.lineJoin = "round";
context.fillStyle = backgroundColor;
context.fillRect(0, 0, canvas.width, canvas.height);

onDrawModeClick();

function onStartDrawing(e) {
  drawing = true;
  context.moveTo(e.clientX, e.clientY);
}

function updateCursor(e) {
  circleCursor.style.left = `${e.clientX - penSize / 2}px`;
  circleCursor.style.top = `${e.clientY - penSize / 2}px`;

  outerCircle.style.width = `${penSize}px`;
  outerCircle.style.height = `${penSize}px`;

  innerCircle.style.width = `${penSize - 2}px`;
  innerCircle.style.height = `${penSize - 2}px`;
}

function onDraw(e) {
  const { clientX, clientY } = e;
  updateCursor(e);
  if (drawing) {
    if (eraser) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(clientX, clientY, penSize / 2, 0, Math.PI * 2, false);
      context.fill();
      context.restore();
    } else {
      context.lineTo(clientX, clientY);
      context.stroke();
    }
  }
}

function onStopDrawing() {
  drawing = false;
  context.beginPath();
}

function setActiveButton(buttonId) {
  document.querySelectorAll(".toolbar button").forEach((button) => {
    button.classList.remove("active");
  });
  document.getElementById(buttonId).classList.add("active");
}

function onDrawModeClick() {
  eraser = false;
  context.strokeStyle = foregroundColor;
  sizeSlider.min = "1";
  sizeSlider.max = "10";
  sizeSlider.value = "1";
  penSize = 2;
  context.lineWidth = penSize;
  setActiveButton("drawMode");
}

function onEraseModeClick() {
  eraser = true;
  context.strokeStyle = backgroundColor;
  sizeSlider.min = "10";
  sizeSlider.max = "50";
  sizeSlider.value = "10";
  penSize = 10;
  context.lineWidth = penSize;
  setActiveButton("eraserMode");
}

function onClearCanvasClick() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  onDrawModeClick();
}

function onDownloadCanvasClick() {
  const link = document.createElement("a");
  link.download = `freedraw-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function onResize() {
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempContext.drawImage(canvas, 0, 0);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(tempCanvas, 0, 0);
  if (eraser) {
    onEraseModeClick();
  } else {
    onDrawModeClick();
  }
}

function onRightClick(e) {
  e.preventDefault();
  drawing = false;
  context.beginPath();

  sizeSliderContainer.style.display = "block";
  sizeSliderContainer.style.left = `${e.clientX}px`;
  sizeSliderContainer.style.top = `${e.clientY}px`;
}

function onSliderChange(e) {
  penSize = e.target.value;
  context.lineWidth = penSize;
}

function onBodyClick(e) {
  if (!sizeSliderContainer.contains(e.target)) {
    sizeSliderContainer.style.display = "none";
  }
}

function saveCanvas() {
  const dataUrl = canvas.toDataURL();
  vscode.postMessage({ command: "saveCanvas", data: dataUrl });
}

function onMouseLeave() {
  drawing = false;
  context.beginPath();
}

window.addEventListener("beforeunload", saveCanvas);

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.command === "restoreCanvas") {
    const img = new Image();
    img.onload = () => context.drawImage(img, 0, 0);
    img.src = message.data;
  }
});
