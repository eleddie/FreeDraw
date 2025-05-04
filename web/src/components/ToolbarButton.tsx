import Icon, { Icons } from "./Icon";

type ToolbarButtonProps = {
  name: keyof typeof Icons;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isActive?: boolean;
  title?: string;
  children?: React.ReactNode;
  disabled?: boolean;
};

export default function ToolbarButton({
  name,
  onClick,
  isActive,
  title,
  disabled,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative p-2 rounded-md transition-colors duration-200 ${
        isActive ? "bg-black/20 dark:bg-white/20" : ""
      } ${
        disabled
          ? "opacity-50 cursor-not-allowed cursor-not-allowed"
          : "hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
      }`}
      title={title}
    >
      <Icon name={name} />
      {children}
    </button>
  );
}
