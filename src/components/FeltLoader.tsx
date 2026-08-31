import { PokerChip } from "./PokerChip";

export function FeltLoader({
  overlay = false,
  label = "Working",
}: {
  overlay?: boolean;
  label?: string;
}) {
  const body = (
    <div
      className="flex flex-col items-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <PokerChip
        size={overlay ? 52 : 44}
        fill="var(--color-gold)"
        className="felt-loader-chip"
      />
      <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
        {label}
      </p>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-felt-deep/75 backdrop-blur-md">
        {body}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24">
      {body}
    </div>
  );
}
