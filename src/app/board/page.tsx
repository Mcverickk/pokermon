import Link from "next/link";
import { PokerChip } from "@/components/PokerChip";
import { RefreshButton } from "@/components/RefreshButton";
import { isDbConfigured } from "@/lib/db";
import { getLeaderboard } from "@/lib/db/queries";
import {
  compareMonthKeys,
  currentMonthKey,
  formatMonthLabel,
  resolveMonthKey,
  shiftMonthKey,
} from "@/lib/ledger";

export const dynamic = "force-dynamic";

function boardHref(monthKey: string) {
  return `/board?month=${monthKey}`;
}

function playerHref(playerId: string, monthKey: string) {
  return `/board/${playerId}?month=${monthKey}`;
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  if (!isDbConfigured()) {
    return <p className="text-mute">Set up the database first.</p>;
  }

  const { month: monthParam } = await searchParams;
  const monthKey = resolveMonthKey(monthParam);
  const currentMonth = currentMonthKey();
  const prevMonth = shiftMonthKey(monthKey, -1);
  const nextMonth = shiftMonthKey(monthKey, 1);
  const canGoNext = compareMonthKeys(nextMonth, currentMonth) <= 0;
  const rows = await getLeaderboard(monthKey);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            House rail
          </p>
          <h1 className="font-display text-4xl tracking-tight">Board</h1>
          <p className="mt-1 text-sm text-mute">{formatMonthLabel(monthKey)}</p>
        </div>
        <RefreshButton className="mt-1" scope="board" />
      </header>

      <nav className="flex items-center justify-between gap-3">
        <Link
          href={boardHref(prevMonth)}
          className="btn-ghost flex h-10 items-center px-4 text-sm font-medium"
        >
          ← {formatMonthLabel(prevMonth)}
        </Link>
        {canGoNext ? (
          <Link
            href={boardHref(nextMonth)}
            className="btn-ghost flex h-10 items-center px-4 text-sm font-medium"
          >
            {formatMonthLabel(nextMonth)} →
          </Link>
        ) : (
          <span className="h-10 px-4" aria-hidden="true" />
        )}
      </nav>

      {rows.length === 0 ? (
        <p className="text-mute">No settled nights this month yet.</p>
      ) : (
        <ol className="glass flex flex-col overflow-hidden rounded-3xl">
          {rows.map((row, i) => (
            <li key={row.playerId} className="border-b border-ivory/8 last:border-b-0">
              <Link
                href={playerHref(row.playerId, monthKey)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory/6"
              >
                <span className="w-7 font-display text-lg tabular text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <PokerChip
                  size={22}
                  fill={
                    row.net > 0 ? "var(--color-gold)" : "var(--color-clay)"
                  }
                />
                <span className="min-w-0 flex-1 font-display text-lg tracking-tight">
                  {row.name}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
