document.addEventListener("DOMContentLoaded", () => {
  onDrawModeClick();
});

document.addEventListener("keydown", handleKeyDown);

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
  canvas.classList.remove("text-cursor");
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
  canvas.classList.remove("text-cursor");
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

function handleKeyDown(e) {
  if (currentState.enteringText) {
    return;
  }

  const actions = {
    z: (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      }
    },
    b: (e) => {
      e.preventDefault();
      onDrawModeClick();
    },
    e: (e) => {
      e.preventDefault();
      onEraseModeClick();
    },
    m: (e) => {
      e.preventDefault();
      onSelectModeClick();
    },
    d: (e) => {
      e.preventDefault();
      onClearCanvasClick();
    },
    p: (e) => {
      e.preventDefault();
      onChangeColor();
    },
    s: (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        saveCanvas();
      }
    },
    r: (e) => {
      e.preventDefault();
      onShapeModeClick(Shapes.RECTANGLE);
    },
    c: (e) => {
      e.preventDefault();
      onShapeModeClick(Shapes.CIRCLE);
    },
    a: (e) => {
      e.preventDefault();
      onShapeModeClick(Shapes.ARROW);
    },
    t: (e) => {
      e.preventDefault();
      onTextModeClick();
    },
    Backspace: (e) => {
      e.preventDefault();
      deleteSelectedArea();
    },
    ArrowUp: (e) => {
      e.preventDefault();
      moveSelection(0, e.shiftKey ? -10 : -1);
    },
    ArrowDown: (e) => {
      e.preventDefault();
      moveSelection(0, e.shiftKey ? 10 : 1);
    },
    ArrowLeft: (e) => {
      e.preventDefault();
      moveSelection(e.shiftKey ? -10 : -1, 0);
    },
    ArrowRight: (e) => {
      e.preventDefault();
      moveSelection(e.shiftKey ? 10 : 1, 0);
    },
  };

  if (actions[e.key]) {
    actions[e.key](e);
  }
}

function moveSelection(dx, dy) {
  if (currentState.selectionStart && currentState.selectionEnd) {
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

    // Update the selection start and end positions
    currentState.selectionStart.x += dx;
    currentState.selectionStart.y += dy;
    currentState.selectionEnd.x += dx;
    currentState.selectionEnd.y += dy;
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

function onSelectModeClick() {
  currentState.mode = State.SELECT;
  canvas.classList.add("canvas-selection");
  canvas.classList.remove("draw-cursor");
  canvas.classList.remove("text-cursor");
  circleCursor.style.display = "none"; // Hide the drawing cursor
  setActiveButton("selectMode");
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
  canvas.classList.add("canvas-selection");
  canvas.classList.remove("draw-cursor");
  canvas.classList.remove("text-cursor");
  circleCursor.style.display = "none"; // Show the drawing cursor
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

function onTextModeClick() {
  currentState = {
    mode: State.TEXT,
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
  canvas.classList.add("text-cursor");
  circleCursor.style.display = "none"; // Hide the drawing cursor
  selectionRectangle.style.display = "none"; // Hide the selection box
  context.strokeStyle = currentState.color;
  context.lineWidth = currentState.penSize;
  setActiveButton("textButton");
}

function onCanvasClick(e) {
  if (currentState.mode === State.TEXT) {
    const dialog = document.getElementById("textInputDialog");
    const textInput = document.getElementById("textInput");

    dialog.showModal();
    currentState.enteringText = true;

    dialog.addEventListener(
      "close",
      () => {
        if (dialog.returnValue === "confirm" && textInput.value) {
          context.fillStyle = currentState.color;
          context.font = `${currentState.penSize * 10}px Arial`;
          context.fillText(textInput.value, e.clientX, e.clientY);
          saveState();
        }
        textInput.value = "";

        currentState.enteringText = false;
      },
      { once: true }
    );
  }
}

let wasCircleCursorVisible = true;
function onToolbarMouseEnter() {
  if (![State.TEXT, State.SELECT].includes(currentState.mode)) {
    wasCircleCursorVisible = false;
  }
  circleCursor.style.display = "none";
}

function onToolbarMouseLeave() {
  if (wasCircleCursorVisible) {
    circleCursor.style.display = "block";
  }
}
