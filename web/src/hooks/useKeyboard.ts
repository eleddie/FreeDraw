import { useHotkeys } from "react-hotkeys-hook";
import { useHistory } from "./useHistory";
import useAppState from "../store/state";
import { TypesTools } from "../types";
import { getRandomColor, getRandomId, updateCursor } from "../utils";

export const useKeyboard = (onSaveCanvas: () => void) => {
  const { undo, redo, elements, setElements } = useHistory();
  const {
    setTool,
    setColor,
    selectedElement,
    setSelectedElement,
    setCopiedElement,
    copiedElement,
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
    if (selectedElement) {
      setElements(
        elements.filter((element) => element.id !== selectedElement.id)
      );
      setSelectedElement(null);
    }
  });
  useHotkeys(["ctrl+c", "meta+c"], () => {
    setCopiedElement(
      elements.find((element) => element.id === selectedElement?.id) || null
    );
  });
  useHotkeys(["ctrl+x", "meta+x"], () => {
    setCopiedElement(
      elements.find((element) => element.id === selectedElement?.id) || null
    );
    setElements(
      elements.filter((element) => element.id !== selectedElement?.id)
    );
  });
  useHotkeys(["ctrl+v", "meta+v"], () => {
    if (copiedElement) {
      const newElement = { ...copiedElement, id: getRandomId() };
      setSelectedElement(newElement);
      setElements([...elements, newElement]);
      setCopiedElement(null);
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
};
