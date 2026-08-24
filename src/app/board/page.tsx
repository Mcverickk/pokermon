import { PokerChip } from "@/components/PokerChip";
import { RefreshButton } from "@/components/RefreshButton";
import { isDbConfigured } from "@/lib/db";
import { getLeaderboard } from "@/lib/db/queries";
import { inr } from "@/lib/ledger";

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
            Lifetime standing.
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
              <div className="flex items-center gap-3 px-4 py-3">
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
                {row.net > 0 ? (
                  <span className="text-base tabular text-gold">
                    +{inr(row.net)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
