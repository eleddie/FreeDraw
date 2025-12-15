import { useHotkeys } from "react-hotkeys-hook";
import { useHistory } from "./useHistory";
import useAppState from "../store/state";
import { TypesTools, Element } from "../types";
import {
  getRandomColor,
  getRandomId,
  updateCursor,
  getStrokeBounds,
  createElement,
} from "../utils";

export const useKeyboard = (onSaveCanvas: () => void) => {
  const { undo, redo, elements, setElements } = useHistory();
  const {
    setTool,
    setColor,
    selectedElements,
    setSelectedElements,
    setCopiedElements,
    copiedElements,
  } = useAppState();

  const onChangeTool = (tool: TypesTools) => {
    setTool(tool);
    updateCursor(tool);
  };

  useHotkeys(["ctrl+z", "meta+z"], () => undo());
  useHotkeys(["ctrl+shift+z", "meta+shift+z"], () => redo());
  useHotkeys("v", () => onChangeTool(TypesTools.Selection));
  useHotkeys("b", () => onChangeTool(TypesTools.Pencil));
  useHotkeys("l", () => onChangeTool(TypesTools.Line));
  useHotkeys("r", () => onChangeTool(TypesTools.Rectangle));
  useHotkeys("c", () => onChangeTool(TypesTools.Circle));
  useHotkeys("a", () => onChangeTool(TypesTools.Arrow));
  useHotkeys("t", () => onChangeTool(TypesTools.Text));
  useHotkeys("e", () => onChangeTool(TypesTools.Eraser));
  useHotkeys("x", () => setColor(getRandomColor()));
  useHotkeys("backspace", () => {
    if (selectedElements.length) {
      setElements(
        elements.filter(
          (element) => !selectedElements.some((sel) => sel.id === element.id)
        )
      );
      setSelectedElements([]);
    }
  });
  useHotkeys(["ctrl+c", "meta+c"], () => {
    setCopiedElements(
      elements.filter((element) =>
        selectedElements.some((sel) => sel.id === element.id)
      )
    );
  });
  useHotkeys(["ctrl+x", "meta+x"], () => {
    setCopiedElements(
      elements.filter((element) =>
        selectedElements.some((sel) => sel.id === element.id)
      )
    );
    setElements(
      elements.filter(
        (element) => !selectedElements.some((sel) => sel.id === element.id)
      )
    );
    setSelectedElements([]);
  });
  useHotkeys(["ctrl+v", "meta+v"], () => {
    if (copiedElements.length) {
      const newElements = copiedElements.map((copiedElement) => ({
        ...copiedElement,
        id: getRandomId(),
      }));
      setSelectedElements(newElements);
      setElements([...elements, ...newElements]);
      setCopiedElements([]);
    }
  });

  useHotkeys(["ctrl+s", "meta+s"], (e) => {
    e.preventDefault();
    onSaveCanvas();
  });
  useHotkeys(["ctrl+d", "meta+d"], (e) => {
    e.preventDefault();
    setElements([]);
  });
  useHotkeys(["ctrl+a", "meta+a"], (e) => {
    e.preventDefault();
    setSelectedElements([...elements]);
  });

  // Group selected elements (Ctrl+G / Cmd+G)
  useHotkeys(["ctrl+g", "meta+g"], (e) => {
    e.preventDefault();
    if (selectedElements.length < 2) return;

    // Get the selected elements from the current elements array
    const toGroup = elements.filter((element) =>
      selectedElements.some((sel) => sel.id === element.id)
    );

    if (toGroup.length < 2) return;

    // Calculate bounds for the group
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    toGroup.forEach((el) => {
      if (el.type === TypesTools.Pencil) {
        if (el.strokes && el.strokes.length > 0) {
          el.strokes.forEach((stroke) => {
            const bounds = getStrokeBounds(stroke);
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
          });
        } else if (el.points && el.points.length > 0) {
          const bounds = getStrokeBounds(el.points);
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
        }
      } else if (el.type === TypesTools.Group && el.groupedElements) {
        // Handle nested groups
        minX = Math.min(minX, el.x1 ?? Infinity);
        minY = Math.min(minY, el.y1 ?? Infinity);
        maxX = Math.max(maxX, el.x2 ?? -Infinity);
        maxY = Math.max(maxY, el.y2 ?? -Infinity);
      } else {
        minX = Math.min(minX, el.x1 ?? Infinity, el.x2 ?? Infinity);
        minY = Math.min(minY, el.y1 ?? Infinity, el.y2 ?? Infinity);
        maxX = Math.max(maxX, el.x1 ?? -Infinity, el.x2 ?? -Infinity);
        maxY = Math.max(maxY, el.y1 ?? -Infinity, el.y2 ?? -Infinity);
      }
    });

    // Create a Group element containing the original elements
    const groupElement: Element = {
      id: getRandomId(),
      type: TypesTools.Group,
      groupedElements: toGroup,
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
    };

    // Remove old elements and add the group
    const remainingElements = elements.filter(
      (element) => !selectedElements.some((sel) => sel.id === element.id)
    );

    setElements([...remainingElements, groupElement]);
    setSelectedElements([groupElement]);
  });

  // Ungroup selected elements (Ctrl+Shift+G / Cmd+Shift+G)
  useHotkeys(["ctrl+shift+g", "meta+shift+g"], (e) => {
    e.preventDefault();
    if (selectedElements.length === 0) return;

    // Find grouped elements among the selection (get fresh from elements array)
    const groupedElements = elements.filter(
      (el) =>
        selectedElements.some((sel) => sel.id === el.id) &&
        el.groupedElements &&
        el.groupedElements.length > 0
    );

    if (groupedElements.length === 0) return;

    // Collect all original elements from the groups, applying movement delta
    const restoredElements: Element[] = [];
    const groupIds = new Set(groupedElements.map((el) => el.id));

    groupedElements.forEach((grouped) => {
      if (!grouped.groupedElements) return;

      // Calculate original bounds from the grouped elements
      let origMinX = Infinity,
        origMinY = Infinity;
      grouped.groupedElements.forEach((original) => {
        if (original.type === TypesTools.Pencil) {
          if (original.strokes && original.strokes.length > 0) {
            original.strokes.forEach((stroke) => {
              const bounds = getStrokeBounds(stroke);
              origMinX = Math.min(origMinX, bounds.minX);
              origMinY = Math.min(origMinY, bounds.minY);
            });
          } else if (original.points && original.points.length > 0) {
            const bounds = getStrokeBounds(original.points);
            origMinX = Math.min(origMinX, bounds.minX);
            origMinY = Math.min(origMinY, bounds.minY);
          }
        } else if (original.x1 !== undefined && original.y1 !== undefined) {
          origMinX = Math.min(
            origMinX,
            original.x1,
            original.x2 ?? original.x1
          );
          origMinY = Math.min(
            origMinY,
            original.y1,
            original.y2 ?? original.y1
          );
        }
      });

      // Calculate how much the group has moved
      const deltaX = (grouped.x1 ?? 0) - origMinX;
      const deltaY = (grouped.y1 ?? 0) - origMinY;

      // Restore each original element with the movement applied
      grouped.groupedElements.forEach((original) => {
        const restored = applyDeltaToElement(original, deltaX, deltaY);
        restoredElements.push({
          ...restored,
          id: getRandomId(),
        });
      });
    });

    // Remove the grouped elements and add back the originals
    const remainingElements = elements.filter((el) => !groupIds.has(el.id));

    setElements([...remainingElements, ...restoredElements]);
    setSelectedElements(restoredElements);
  });
};

// Helper function to apply delta movement to an element
function applyDeltaToElement(
  element: Element,
  deltaX: number,
  deltaY: number
): Element {
  const result = { ...element };

  // Update bounds
  if (result.x1 !== undefined) result.x1 = result.x1 + deltaX;
  if (result.y1 !== undefined) result.y1 = result.y1 + deltaY;
  if (result.x2 !== undefined) result.x2 = result.x2 + deltaX;
  if (result.y2 !== undefined) result.y2 = result.y2 + deltaY;

  // Update points for pencil elements
  if (result.points) {
    result.points = result.points.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    }));
  }

  // Update strokes for merged elements
  if (result.strokes) {
    result.strokes = result.strokes.map((stroke) =>
      stroke.map((p) => ({
        x: p.x + deltaX,
        y: p.y + deltaY,
      }))
    );
  }

  // Recreate roughElement for shapes that use it
  if (
    [
      TypesTools.Line,
      TypesTools.Rectangle,
      TypesTools.Circle,
      TypesTools.Arrow,
    ].includes(result.type)
  ) {
    // Regenerate roughElement with the new coordinates
    const recreated = createElement(
      result.id,
      result.x1!,
      result.y1!,
      result.x2!,
      result.y2!,
      result.type,
      result.color,
      result.src,
      result.initialCoordinates
    );
    result.roughElement = recreated.roughElement;
  }

  // Handle Group elements - apply delta to all children
  if (result.type === TypesTools.Group && result.groupedElements) {
    result.groupedElements = result.groupedElements.map((child) =>
      applyDeltaToElement(child, deltaX, deltaY)
    );
  }

  return result;
}
