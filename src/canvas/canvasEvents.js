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
        saveSelectedAreaState();
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
  const actions = {
    [State.DRAW]: () => {
      currentState.drawing = false;
      context.beginPath();
      if (e.altKey) {
        currentState.startX = currentState.endX;
        currentState.startY = currentState.endY;
      }
    },
    [State.ERASE]: () => {
      currentState.drawing = false;
      context.beginPath();
      if (e.altKey) {
        currentState.startX = currentState.endX;
        currentState.startY = currentState.endY;
      }
    },
    [Shapes.RECTANGLE]: () => {
      currentState.drawing = false;
      context.beginPath();
      if (e.altKey) {
        currentState.startX = currentState.endX;
        currentState.startY = currentState.endY;
      }
    },
    [Shapes.CIRCLE]: () => {
      currentState.drawing = false;
      context.beginPath();
      if (e.altKey) {
        currentState.startX = currentState.endX;
        currentState.startY = currentState.endY;
      }
    },
    [Shapes.ARROW]: () => {
      currentState.drawing = false;
      context.beginPath();
      if (e.altKey) {
        currentState.startX = currentState.endX;
        currentState.startY = currentState.endY;
      }
    },
    [State.SELECT]: () => {
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
        } else {
          saveSelectedAreaState();
        }
      }
    },
    [State.MOVE]: () => {
      if (currentState.movingSelection) {
        currentState.movingSelection = false;
      }
    },
  };

  if (actions[currentState.mode]) {
    actions[currentState.mode]();
  }
}

function onMouseLeaveCanvas() {
  currentState.drawing = false;
  context.beginPath();
}

function onTouchStartCanvas(e) {
  e.preventDefault();
  const touch = e.touches[0];
  onMouseDownCanvas({ clientX: touch.clientX, clientY: touch.clientY });
}

function onTouchMoveCanvas(e) {
  e.preventDefault();
  const touch = e.touches[0];
  onMouseMoveCanvas({ clientX: touch.clientX, clientY: touch.clientY });
}

function onTouchEndCanvas(e) {
  e.preventDefault();
  onMouseUpCanvas(e.changedTouches[0]);
}

function onTouchCancelCanvas(e) {
  e.preventDefault();
  onMouseLeaveCanvas();
}

function saveSelectedAreaState() {
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
