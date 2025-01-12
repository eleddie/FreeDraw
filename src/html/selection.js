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
