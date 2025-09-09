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
};
