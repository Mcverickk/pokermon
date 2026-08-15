import { Chevron } from "@/components/Chevron";
import { PokerChip } from "@/components/PokerChip";
import { RefreshButton } from "@/components/RefreshButton";
import { isDbConfigured } from "@/lib/db";
import { getLeaderboard } from "@/lib/db/queries";
import { inr } from "@/lib/ledger";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  if (!isDbConfigured()) {
    return <p className="text-mute">Set up the database first.</p>;
  }

  const rows = await getLeaderboard();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            House rail
          </p>
          <h1 className="font-display text-4xl tracking-tight">Board</h1>
          <p className="mt-1 text-sm text-mute">
            Open a name for nights and P/L.
          </p>
        </div>
        <RefreshButton className="mt-1" scope="board" />
      </header>

      {rows.length === 0 ? (
        <p className="text-mute">
          The rail stays empty until a night is settled.
        </p>
      ) : (
        <ol className="glass flex flex-col overflow-hidden rounded-3xl">
          {rows.map((row, i) => (
            <li key={row.playerId} className="border-b border-ivory/8 last:border-b-0">
              <Link
                href={`/board/${row.playerId}`}
                aria-label={`${row.name} history`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory/6"
              >
                <span className="w-7 font-display text-lg tabular text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <PokerChip
                  size={22}
                  fill={i === 0 ? "var(--color-gold)" : "var(--color-clay)"}
                />
                <span className="min-w-0 flex-1 font-display text-lg tracking-tight">
                  {row.name}
                </span>
                <span
                  className={`text-base tabular ${
                    row.net > 0
                      ? "text-gold"
                      : row.net < 0
                        ? "text-clay"
                        : "text-mute"
                  }`}
                >
                  {row.net > 0 ? "+" : row.net < 0 ? "−" : ""}
                  {inr(Math.abs(row.net))}
                </span>
                <span className="text-mute transition-colors group-hover:text-gold">
                  <Chevron />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
