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

onDrawModeClick();

let undoStack = [];
let redoStack = [];

function updateUndoRedoButtons() {
  document.getElementById("undoButton").disabled = undoStack.length === 0;
  document.getElementById("redoButton").disabled = redoStack.length === 0;
}

function saveState() {
  const dataUrl = canvas.toDataURL();
  undoStack.push(dataUrl);
  redoStack = []; // Clear the redo stack whenever a new action is taken
  if (undoStack.length > 10) {
    undoStack.shift(); // Limit the undo stack to 10 states
  }
  updateUndoRedoButtons();
}

function onUndo() {
  if (undoStack.length > 0) {
    const dataUrl = undoStack.pop();
    redoStack.push(canvas.toDataURL()); // Save the current state to the redo stack
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
    updateUndoRedoButtons();
  }
}

function onRedo() {
  if (redoStack.length > 0) {
    const dataUrl = redoStack.pop();
    undoStack.push(canvas.toDataURL()); // Save the current state to the undo stack
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
    updateUndoRedoButtons();
  }
}

function updateCursor(e) {
  circleCursor.style.left = `${e.clientX - currentState.penSize / 2}px`;
  circleCursor.style.top = `${e.clientY - currentState.penSize / 2}px`;

  outerCircle.style.width = `${currentState.penSize}px`;
  outerCircle.style.height = `${currentState.penSize}px`;

  innerCircle.style.width = `${currentState.penSize - 2}px`;
  innerCircle.style.height = `${currentState.penSize - 2}px`;
}

function onMouseDownCanvas(e) {
  switch (currentState.mode) {
    case State.DRAW:
    case Shapes.RECTANGLE:
    case Shapes.CIRCLE:
    case Shapes.ARROW:
      saveState();
      currentState.drawing = true;
      currentState.startX = e.clientX;
      currentState.startY = e.clientY;
      currentState.initialX = e.clientX; // Store initial X position
      currentState.initialY = e.clientY; // Store initial Y position
      currentState.lockedDirection = null; // Reset locked direction
      currentState.endX = e.clientX; // Initialize endX
      currentState.endY = e.clientY; // Initialize endY
      context.moveTo(e.clientX, e.clientY);
      currentState.tempCanvasContent = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ); // Initialize tempCanvasContent
      break;
    case State.ERASE:
      saveState();
      currentState.drawing = true;
      context.moveTo(e.clientX, e.clientY);
      break;
    case State.SELECT:
      if (!isInsideSelection(e.clientX, e.clientY)) {
        currentState.makingSelection = true;
        onStartSelection(e);
      } else {
        currentState.mode = State.MOVE;
        currentState.movingSelection = true;
        currentState.selectionStart = { x: e.clientX, y: e.clientY };
        // Save the selected area to move it around and remove it from the canvas temporarily
        const width = parseInt(selectionRectangle.style.width);
        const height = parseInt(selectionRectangle.style.height);
        const left = parseInt(selectionRectangle.style.left);
        const top = parseInt(selectionRectangle.style.top);
        currentState.selectedImageData = context.getImageData(
          left,
          top,
          width,
          height
        );
        context.clearRect(left, top, width, height);

        currentState.tempCanvasContent = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        context.putImageData(currentState.tempCanvasContent, 0, 0); // Restore the temporary canvas content immediately
        context.putImageData(currentState.selectedImageData, left, top);
      }
      break;
    case State.MOVE:
      if (isInsideSelection(e.clientX, e.clientY)) {
        currentState.movingSelection = true;
        currentState.selectionStart = { x: e.clientX, y: e.clientY };
      } else {
        currentState.mode = State.SELECT;
        currentState.makingSelection = true;
        onStartSelection(e);
      }
      break;
  }
}

function onMouseMoveCanvas(e) {
  switch (currentState.mode) {
    case State.DRAW:
    case State.ERASE:
    case Shapes.RECTANGLE:
    case Shapes.CIRCLE:
    case Shapes.ARROW:
      const { clientX, clientY } = e;
      updateCursor(e);
      if (currentState.drawing) {
        if (currentState.eraser) {
          context.save();
          context.globalCompositeOperation = "destination-out";
          context.beginPath();
          context.arc(
            clientX,
            clientY,
            currentState.penSize / 2,
            0,
            Math.PI * 2,
            false
          );
          context.fill();
          context.restore();
        } else {
          if (
            currentState.mode === Shapes.RECTANGLE ||
            currentState.mode === Shapes.CIRCLE ||
            currentState.mode === Shapes.ARROW
          ) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.putImageData(currentState.tempCanvasContent, 0, 0);

            if (e.altKey) {
              const dx = clientX - currentState.endX;
              const dy = clientY - currentState.endY;
              currentState.startX += dx;
              currentState.startY += dy;
              currentState.endX = clientX;
              currentState.endY = clientY;
            } else {
              currentState.endX = clientX;
              currentState.endY = clientY;
            }

            drawShape(
              currentState.mode,
              currentState.startX,
              currentState.startY,
              currentState.endX,
              currentState.endY,
              e.shiftKey
            );
          } else {
            if (e.shiftKey && e.altKey) {
              const dx = clientX - currentState.startX;
              const dy = clientY - currentState.startY;
              const absDx = Math.abs(dx);
              const absDy = Math.abs(dy);
              if (absDx > absDy) {
                context.lineTo(
                  currentState.startX + (dx > 0 ? absDy : -absDy),
                  currentState.startY + (dy > 0 ? absDy : -absDy)
                );
              } else {
                context.lineTo(
                  currentState.startX + (dx > 0 ? absDx : -absDx),
                  currentState.startY + (dy > 0 ? absDx : -absDx)
                );
              }
            } else if (e.shiftKey) {
              if (!currentState.lockedDirection) {
                const dx = Math.abs(clientX - currentState.startX);
                const dy = Math.abs(clientY - currentState.startY);
                currentState.lockedDirection =
                  dx > dy ? "horizontal" : "vertical";
              }
              if (currentState.lockedDirection === "horizontal") {
                context.lineTo(clientX, currentState.startY);
              } else {
                context.lineTo(currentState.startX, clientY);
              }
            } else {
              context.lineTo(clientX, clientY);
            }
            context.stroke();
          }
        }
      }
      break;
    case State.SELECT:
      if (currentState.makingSelection) {
        onMoveSelection(e);
      }
      break;
    case State.MOVE:
      if (currentState.movingSelection) {
        onMoveSelectedArea(e);
      }
      break;
  }
}

function onMouseUpCanvas(e) {
  switch (currentState.mode) {
    case State.DRAW:
    case State.ERASE:
    case Shapes.RECTANGLE:
    case Shapes.CIRCLE:
    case Shapes.ARROW:
      currentState.drawing = false;
      context.beginPath();
      if (e.altKey) {
        currentState.startX = currentState.endX;
        currentState.startY = currentState.endY;
      }
      break;
    case State.SELECT:
      if (currentState.makingSelection) {
        currentState.makingSelection = false;
        onEndSelection(e);

        // Check if the selection area is too small
        const width = currentState.selectionEnd
          ? currentState.selectionEnd.x - currentState.selectionStart.x
          : 0;
        const height = currentState.selectionEnd
          ? currentState.selectionEnd.y - currentState.selectionStart.y
          : 0;
        if (Math.abs(width) < 5 || Math.abs(height) < 5) {
          selectionRectangle.style.display = "none";
          currentState.selectionStart = null;
          currentState.selectionEnd = null;
        }
      }
      break;
    case State.MOVE:
      if (currentState.movingSelection) {
        currentState.movingSelection = false;
      }
      break;
  }
}

function setActiveButton(buttonId) {
  document.querySelectorAll(".toolbar button").forEach((button) => {
    button.classList.remove("active");
  });
  document.getElementById(buttonId).classList.add("active");
}

function onDrawModeClick() {
  currentState = {
    mode: State.DRAW,
    color: currentState.color,
    penSize: 2,
    eraser: false,
    drawing: false,
    makingSelection: false,
    movingSelection: false,
    selectionStart: null,
    selectionEnd: null,
    selectedImageData: null,
  };
  canvas.classList.remove("canvas-selection");
  canvas.classList.add("draw-cursor");
  circleCursor.style.display = "block"; // Show the drawing cursor
  selectionRectangle.style.display = "none"; // Hide the selection box
  context.strokeStyle = currentState.color;
  sizeSlider.min = "1";
  sizeSlider.max = "10";
  sizeSlider.value = "1";
  context.lineWidth = currentState.penSize;
  setActiveButton("drawMode");
}

function onEraseModeClick() {
  currentState = {
    mode: State.ERASE,
    color: currentState.color,
    penSize: 10,
    eraser: true,
    drawing: false,
    makingSelection: false,
    movingSelection: false,
    selectionStart: null,
    selectionEnd: null,
    selectedImageData: null,
  };
  context.strokeStyle = currentState.color;
  sizeSlider.min = "10";
  sizeSlider.max = "50";
  sizeSlider.value = "10";
  context.lineWidth = currentState.penSize;
  selectionRectangle.style.display = "none"; // Hide the selection box
  canvas.classList.add("draw-cursor");
  circleCursor.style.display = "block"; // Show the drawing cursor
  setActiveButton("eraserMode");
}

function onClearCanvasClick() {
  const dialog = document.getElementById("clearCanvasDialog");
  dialog.showModal();
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "confirm") {
      confirmClearCanvas();
    }
  });
}

function confirmClearCanvas() {
  saveState();
  context.clearRect(0, 0, canvas.width, canvas.height);
  onDrawModeClick();
}

function cancelClearCanvas() {
  document.getElementById("clearCanvasDialog").style.display = "none";
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

  context.drawImage(tempCanvas, 0, 0);
  if (currentState.eraser) {
    onEraseModeClick();
  } else {
    onDrawModeClick();
  }
}

function onRightClick(e) {
  e.preventDefault();
  currentState.drawing = false;
  context.beginPath();

  sizeSliderContainer.style.display = "block";
  sizeSliderContainer.style.left = `${e.clientX}px`;
  sizeSliderContainer.style.top = `${e.clientY}px`;
}

function onSliderChange(e) {
  currentState.penSize = e.target.value;
  context.lineWidth = currentState.penSize;
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

function onMouseLeaveCanvas() {
  currentState.drawing = false;
  context.beginPath();
}

function handleKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    onUndo();
  } else if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "y" || (e.key === "z" && e.shiftKey))
  ) {
    e.preventDefault();
    onRedo();
  } else if (e.key === "b") {
    e.preventDefault();
    onDrawModeClick();
  } else if (e.key === "e") {
    e.preventDefault();
    onEraseModeClick();
  } else if (e.key === "m") {
    e.preventDefault();
    onSelectModeClick();
  } else if (e.key === "d") {
    e.preventDefault();
    onClearCanvasClick();
  } else if (e.key === "c") {
    e.preventDefault();
    onChangeColor();
  } else if (e.key === "Enter") {
    e.preventDefault();
    onDownloadCanvasClick();
  }
}

function onChangeColor() {
  document.getElementById("colorPicker").click();
}

function onColorSelected(e) {
  currentState.color = e.target.value;
  document.getElementById("selectedColorIndicator").style.backgroundColor =
    currentState.color;
  if (!currentState.eraser) {
    context.strokeStyle = currentState.color;
  }
}

document.addEventListener("keydown", handleKeyDown);

window.addEventListener("beforeunload", saveCanvas);

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.command === "restoreCanvas") {
    const img = new Image();
    img.onload = () => context.drawImage(img, 0, 0);
    img.src = message.data;
  }
  updateUndoRedoButtons();
});

function onSelectModeClick() {
  currentState.mode = State.SELECT;
  canvas.classList.add("canvas-selection");
  canvas.classList.remove("draw-cursor");
  circleCursor.style.display = "none"; // Hide the drawing cursor
  setActiveButton("selectMode");
}

function onStartSelection(e) {
  if (currentState.mode === State.SELECT) {
    currentState.selectionStart = { x: e.clientX, y: e.clientY };
    currentState.selectionEnd = null;
    currentState.selectedImageData = null;
    selectionRectangle.style.display = "block";
    selectionRectangle.style.left = `${currentState.selectionStart.x}px`;
    selectionRectangle.style.top = `${currentState.selectionStart.y}px`;
    selectionRectangle.style.width = "0px";
    selectionRectangle.style.height = "0px";
  }
}

function onMoveSelection(e) {
  if (currentState.mode === State.SELECT && currentState.selectionStart) {
    currentState.selectionEnd = { x: e.clientX, y: e.clientY };
    const width = currentState.selectionEnd.x - currentState.selectionStart.x;
    const height = currentState.selectionEnd.y - currentState.selectionStart.y;
    selectionRectangle.style.width = `${Math.abs(width)}px`;
    selectionRectangle.style.height = `${Math.abs(height)}px`;
    selectionRectangle.style.left = `${Math.min(
      currentState.selectionStart.x,
      currentState.selectionEnd.x
    )}px`;
    selectionRectangle.style.top = `${Math.min(
      currentState.selectionStart.y,
      currentState.selectionEnd.y
    )}px`;
  }
}

function onMoveSelectedArea(e) {
  if (currentState.mode === State.MOVE && currentState.movingSelection) {
    const dx = e.clientX - currentState.selectionStart.x;
    const dy = e.clientY - currentState.selectionStart.y;
    const width = parseInt(selectionRectangle.style.width);
    const height = parseInt(selectionRectangle.style.height);
    const left = parseInt(selectionRectangle.style.left);
    const top = parseInt(selectionRectangle.style.top);

    // Restore the temporary canvas content
    context.putImageData(currentState.tempCanvasContent, 0, 0);

    // Create a new canvas to filter out empty pixels
    const tempCanvas = document.createElement("canvas");
    const tempContext = tempCanvas.getContext("2d");
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempContext.putImageData(currentState.selectedImageData, 0, 0);

    // Get the image data and filter out empty pixels
    const imageData = tempContext.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        // Check if the pixel is transparent
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
    tempContext.putImageData(imageData, 0, 0);

    // Move the selection rectangle
    selectionRectangle.style.left = `${left + dx}px`;
    selectionRectangle.style.top = `${top + dy}px`;

    // Redraw the selected area at the new position
    context.drawImage(tempCanvas, left + dx, top + dy);

    currentState.selectionStart = { x: e.clientX, y: e.clientY };
  }
}

function onEndSelection(e) {
  if (
    currentState.mode === State.SELECT &&
    currentState.selectionStart &&
    currentState.selectionEnd
  ) {
    const width = currentState.selectionEnd.x - currentState.selectionStart.x;
    const height = currentState.selectionEnd.y - currentState.selectionStart.y;

    // Check if the selection area is too small
    if (Math.abs(width) < 5 || Math.abs(height) < 5) {
      selectionRectangle.style.display = "none";
      currentState.selectionStart = null;
      currentState.selectionEnd = null;
      return;
    }

    const left = Math.min(
      currentState.selectionStart.x,
      currentState.selectionEnd.x
    );
    const top = Math.min(
      currentState.selectionStart.y,
      currentState.selectionEnd.y
    );

    currentState.selectedImageData = context.getImageData(
      left,
      top,
      Math.abs(width),
      Math.abs(height)
    );
    currentState.movingSelection = false;
    // Keep the selection box in place
    selectionRectangle.style.left = `${left}px`;
    selectionRectangle.style.top = `${top}px`;
    selectionRectangle.style.width = `${Math.abs(width)}px`;
    selectionRectangle.style.height = `${Math.abs(height)}px`;

    saveState(); // Save the state after ending the selection
  }
}

function isInsideSelection(x, y) {
  const rect = selectionRectangle.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function onShapeModeClick(shape) {
  onDrawModeClick();
  currentState = {
    mode: shape,
    color: currentState.color,
    penSize: currentState.penSize,
    eraser: false,
    drawing: false,
    makingSelection: false,
    movingSelection: false,
    selectionStart: null,
    selectionEnd: null,
    selectedImageData: null,
  };
  canvas.classList.remove("canvas-selection");
  canvas.classList.add("draw-cursor");
  circleCursor.style.display = "block"; // Show the drawing cursor
  selectionRectangle.style.display = "none"; // Hide the selection box
  context.strokeStyle = currentState.color;
  context.lineWidth = currentState.penSize;
  setActiveButton(`${shape}Button`);
}

function drawShape(shape, startX, startY, endX, endY, shiftKey) {
  context.beginPath();
  switch (shape) {
    case Shapes.RECTANGLE:
      if (shiftKey) {
        const size = Math.min(Math.abs(endX - startX), Math.abs(endY - startY));
        context.rect(
          startX,
          startY,
          size * Math.sign(endX - startX),
          size * Math.sign(endY - startY)
        );
      } else {
        context.rect(startX, startY, endX - startX, endY - startY);
      }
      break;
    case Shapes.CIRCLE:
      if (shiftKey) {
        const radius = Math.min(
          Math.abs(endX - startX),
          Math.abs(endY - startY)
        );
        context.arc(startX, startY, radius, 0, Math.PI * 2);
      } else {
        const radiusX = Math.abs(endX - startX);
        const radiusY = Math.abs(endY - startY);
        context.ellipse(startX, startY, radiusX, radiusY, 0, 0, Math.PI * 2);
      }
      break;
    case Shapes.ARROW:
      if (shiftKey) {
        const dx = endX - startX;
        const dy = endY - startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx > absDy * 1.5) {
          endY = startY;
        } else if (absDy > absDx * 1.5) {
          endX = startX;
        } else {
          const signX = Math.sign(dx);
          const signY = Math.sign(dy);
          const size = Math.min(absDx, absDy);
          endX = startX + size * signX;
          endY = startY + size * signY;
        }
      }
      const headlen = 10; // length of head in pixels
      const angle = Math.atan2(endY - startY, endX - startX);
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.lineTo(
        endX - headlen * Math.cos(angle - Math.PI / 6),
        endY - headlen * Math.sin(angle - Math.PI / 6)
      );
      context.moveTo(endX, endY);
      context.lineTo(
        endX - headlen * Math.cos(angle + Math.PI / 6),
        endY - headlen * Math.sin(angle + Math.PI / 6)
      );
      break;
  }
  context.stroke();
}
