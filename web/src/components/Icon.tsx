import Arrow from "../assets/arrow.svg";
import Circle from "../assets/circle.svg";
import Download from "../assets/download.svg";
import Draw from "../assets/draw.svg";
import Eraser from "../assets/eraser.svg";
import Palette from "../assets/palette.svg";
import Redo from "../assets/redo.svg";
import Select from "../assets/select.svg";
import Square from "../assets/square.svg";
import Text from "../assets/text.svg";
import Trash from "../assets/trash.svg";
import Undo from "../assets/undo.svg";
import Line from "../assets/line.svg";
import Image from "../assets/image.svg";

export const Icons = {
  arrow: Arrow,
  circle: Circle,
  download: Download,
  draw: Draw,
  eraser: Eraser,
  palette: Palette,
  redo: Redo,
  select: Select,
  square: Square,
  text: Text,
  trash: Trash,
  undo: Undo,
  line: Line,
  image: Image,
};

export default function Icon({ name }: { name: keyof typeof Icons }) {
  return (
    <img
      src={Icons[name]}
      alt={name}
      className="dark:invert invert-0 select-none pointer-events-none"
    />
  );
}
