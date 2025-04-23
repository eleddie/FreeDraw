export default function ColorIndicator({ color }: { color: string }) {
  return (
    <div
      className="absolute right-1 bottom-1 w-2 h-2 bg-red-500 rounded-full"
      style={{
        backgroundColor: color,
      }}
    />
  );
}
