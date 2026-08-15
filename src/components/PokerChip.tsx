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

const shuffleFills = [
  "var(--color-clay)",
  "var(--color-gold)",
  "#2f5640",
  "var(--color-clay)",
  "var(--color-gold)",
  "#2f5640",
] as const;

function ChipSide({ id }: { id: string }) {
  const shade = `chip-shade-${id}`;
  const face = `chip-face-${id}`;
  const sheen = `chip-sheen-${id}`;
  return (
    <svg viewBox="0 0 120 40" className="chip-side" aria-hidden>
      <defs>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="45%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={sheen} cx="38%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="30" rx="56" ry="8.5" fill="color-mix(in srgb, var(--chip-fill) 62%, #000)" />
      <rect x="4" y="13" width="112" height="17" fill="var(--chip-fill)" />
      <rect x="4" y="13" width="112" height="17" fill={`url(#${shade})`} />
      <g fill="var(--color-ivory)">
        <rect x="11" y="15.5" width="7.5" height="11" rx="2.2" />
        <rect x="29" y="15.5" width="7.5" height="11" rx="2.2" />
        <rect x="83.5" y="15.5" width="7.5" height="11" rx="2.2" />
        <rect x="101.5" y="15.5" width="7.5" height="11" rx="2.2" />
      </g>
      <ellipse cx="60" cy="13.5" rx="56" ry="9.5" fill="var(--chip-fill)" />
      <ellipse cx="60" cy="13.5" rx="56" ry="9.5" fill={`url(#${face})`} />
      <ellipse cx="60" cy="13.5" rx="56" ry="9.5" fill={`url(#${sheen})`} />
      <ellipse
        cx="60"
        cy="13.5"
        rx="36"
        ry="5.6"
        fill="none"
        stroke="var(--color-ivory)"
        strokeWidth="1.7"
        opacity="0.9"
      />
      <ellipse cx="60" cy="13.5" rx="20" ry="3.4" fill="var(--color-ivory)" />
    </svg>
  );
}

export function ChipShuffle() {
  return (
    <span className="chip-shuffle" aria-hidden>
      {shuffleFills.map((fill, i) => (
        <span
          key={i}
          className="chip-shuffle-piece"
          style={
            {
              "--chip-fill": fill,
              "--n": i,
              "--dir": i % 2 === 0 ? 1 : -1,
              "--pile": Math.floor(i / 2),
            } as React.CSSProperties
          }
        >
          <ChipSide id={String(i)} />
        </span>
      ))}
    </span>
  );
}
