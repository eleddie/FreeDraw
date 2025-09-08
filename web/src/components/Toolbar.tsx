import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import useAppState from "../store/state";
import { useHistory } from "../hooks/useHistory";
import { TypesTools, Action } from "../types";
import ColorCompact from "@uiw/react-color-compact";
import ColorIndicator from "./ColorIndicator";
import { createElement, getRandomId } from "../utils";

type ToolbarProps = {
  onSaveCanvas: () => void;
};

export default function Toolbar({ onSaveCanvas }: ToolbarProps) {
  const { color, setColor, setIsInToolbar, setTool, setAction, tool, action } =
    useAppState();
  const { undo, redo, setElements, elements } = useHistory();

  const onClickPalette = () => {
    setTool(TypesTools.Pencil);
    if (action === Action.PickingColor) {
      setAction(Action.Drawing);
    } else {
      setAction(Action.PickingColor);
    }
  };

  const onMouseEnter = () => {
    setIsInToolbar(true);
  };

  const onMouseLeave = () => {
    setIsInToolbar(false);
  };

  const onSelectMode =
    (name: TypesTools) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setTool(name);
    };

  const isActive = (name: TypesTools) => {
    return tool === name;
  };

  const onClearCanvas = () => {
    setElements([]);
    localStorage.removeItem("freedraw-elements");
  };

  const onUploadImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = uploadedImage;
        reader.readAsDataURL(file);
      }
    };

    input.click();
  };

  const uploadedImage = (event: Event) => {
    const id = getRandomId();
    const img = new Image();
    // Make sure the min width and height is 5% of the window and the max width and height is 80% of the window.
    // Keep aspect ratio while resizing

    img.onload = () => {
      const aspectRatio = img.width / img.height;

      // Calculate min dimensions while maintaining aspect ratio
      let minWidth = window.innerWidth * 0.05;
      let minHeight = minWidth / aspectRatio;
      if (minHeight < window.innerHeight * 0.05) {
        minHeight = window.innerHeight * 0.05;
        minWidth = minHeight * aspectRatio;
      }

      // Calculate max dimensions while maintaining aspect ratio
      let maxWidth = window.innerWidth * 0.8;
      let maxHeight = maxWidth / aspectRatio;
      if (maxHeight > window.innerHeight * 0.8) {
        maxHeight = window.innerHeight * 0.8;
        maxWidth = maxHeight * aspectRatio;
      }

      // Apply min/max constraints while keeping aspect ratio
      img.width = Math.min(Math.max(img.width, minWidth), maxWidth);
      img.height = img.width / aspectRatio;

      const element = createElement(
        id,
        window.innerWidth / 2 - img.width / 2,
        window.innerHeight / 2 - img.height / 2,
        window.innerWidth / 2 + img.width / 2,
        window.innerHeight / 2 + img.height / 2,
        TypesTools.Image,
        undefined,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        event.target?.result
      );
      setElements((prevElements) => [...prevElements, element]);
      setTool(TypesTools.Selection);
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    img.src = event.target?.result;
  };

  return (
    <>
      <div className="fixed top-4 left-4 z-10 flex flex-col gap-2">
        <div
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="bg-black/10 dark:bg-white/10 rounded-md p-2 backdrop-blur-xs"
        >
          <div className="flex flex-row gap-2">
            <ToolbarButton
              name="select"
              title="Select (M)"
              onClick={onSelectMode(TypesTools.Selection)}
              isActive={isActive(TypesTools.Selection)}
            />

            <ToolbarButton
              name="palette"
              title={`Select Color (I)\nRandom Color (X)`}
              onClick={onClickPalette}
              isActive={action === Action.PickingColor}
            >
              <ColorIndicator color={color} />
            </ToolbarButton>

            <ToolbarButton
              name="draw"
              title="Brush (B)"
              onClick={onSelectMode(TypesTools.Pencil)}
              isActive={isActive(TypesTools.Pencil)}
            />

            <ToolbarButton
              name="eraser"
              title="Eraser (E)"
              onClick={onSelectMode(TypesTools.Eraser)}
              isActive={isActive(TypesTools.Eraser)}
            />

            <ToolbarSeparator />

            <ToolbarButton
              name="line"
              title="Line (L)"
              onClick={onSelectMode(TypesTools.Line)}
              isActive={isActive(TypesTools.Line)}
            />
            <ToolbarButton
              name="square"
              title="Rectangle (R)"
              onClick={onSelectMode(TypesTools.Rectangle)}
              isActive={isActive(TypesTools.Rectangle)}
            />
            <ToolbarButton
              name="circle"
              title="Circle (C)"
              onClick={onSelectMode(TypesTools.Circle)}
              isActive={isActive(TypesTools.Circle)}
            />

            <ToolbarButton
              name="arrow"
              title="Arrow (A)"
              onClick={onSelectMode(TypesTools.Arrow)}
              isActive={isActive(TypesTools.Arrow)}
            />
            <ToolbarButton
              name="text"
              title="Text (T)"
              onClick={onSelectMode(TypesTools.Text)}
              isActive={isActive(TypesTools.Text)}
            />
            <ToolbarButton
              name="image"
              title="Upload Image (U)"
              onClick={onUploadImage}
            />
          </div>
        </div>
        {action === Action.PickingColor && (
          <ColorCompact
            className="self-start"
            color={color}
            onChange={(color) => {
              setAction(Action.None);
              setColor(color.hex);
            }}
          />
        )}
      </div>

      <div className="fixed bottom-4 right-4 z-10 flex flex-col gap-2">
        <div
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="bg-black/10 dark:bg-white/10 rounded-md p-2 backdrop-blur-xs"
        >
          <div className="flex flex-row gap-2">
            <ToolbarButton name="undo" title="Undo (Ctrl+Z)" onClick={undo} />
            <ToolbarButton
              name="redo"
              title="Redo (Ctrl+Shift+Z)"
              onClick={redo}
            />

            <ToolbarSeparator />

            <ToolbarButton
              name="trash"
              title="Clear Canvas (Ctrl+D)"
              onClick={onClearCanvas}
              disabled={elements.length === 0}
            />
            <ToolbarButton
              name="download"
              title="Download Canvas (Ctrl+S)"
              onClick={onSaveCanvas}
              disabled={elements.length === 0}
            />
          </div>
        </div>
      </div>
    </>
  );
}
