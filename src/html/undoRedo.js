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
