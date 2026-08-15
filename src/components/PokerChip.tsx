export function PokerChip({
  size = 40,
  fill = "var(--color-clay)",
  className = "",
}: {
  size?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <span
      className={`poker-chip relative inline-block shrink-0 ${className}`}
      style={
        {
          width: size,
          height: size,
          "--chip-fill": fill,
          "--chip-center": "var(--color-ivory)",
        } as React.CSSProperties
      }
      aria-hidden
    />
  );
}

export function ChipStack({ count, size = 30 }: { count: number; size?: number }) {
  const n = Math.min(Math.max(count, 1), 5);
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size + (n - 1) * 5 }}
      aria-hidden
    >
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="poker-chip absolute left-0"
          style={
            {
              width: size,
              height: size,
              bottom: i * 5,
              zIndex: n - i,
              "--chip-fill": i % 2 === 0 ? "var(--color-clay)" : "#2f5640",
              "--chip-center": "var(--color-ivory)",
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
