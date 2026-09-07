import Link from "next/link";
import { PokerChip } from "@/components/PokerChip";
import { RefreshButton } from "@/components/RefreshButton";
import { isDbConfigured } from "@/lib/db";
import { getLeaderboard } from "@/lib/db/queries";
import {
  ALL_TIME_MONTH_KEY,
  compareMonthKeys,
  currentMonthKey,
  formatBuyIns,
  formatMonthLabel,
  resolveBoardScope,
  shiftMonthKey,
} from "@/lib/ledger";

export const dynamic = "force-dynamic";

function boardHref(monthParam: string) {
  return `/board?month=${monthParam}`;
}

function playerHref(playerId: string, monthParam: string) {
  return `/board/${playerId}?month=${monthParam}`;
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
  const scope = resolveBoardScope(monthParam);
  const currentMonth = currentMonthKey();
  const rows = await getLeaderboard(scope.monthParam);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            House rail
          </p>
          <h1 className="font-display text-4xl tracking-tight">Board</h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-sm text-mute">
              {scope.allTime
                ? "All time"
                : formatMonthLabel(scope.monthParam)}
            </p>
            {scope.allTime ? (
              <Link
                href={boardHref(currentMonth)}
                className="text-sm text-gold"
              >
                This month
              </Link>
            ) : (
              <Link
                href={boardHref(ALL_TIME_MONTH_KEY)}
                className="text-sm text-gold"
              >
                All time
              </Link>
            )}
          </div>
        </div>
        <RefreshButton className="mt-1" scope="board" />
      </header>

      <p className="max-w-md text-sm leading-snug text-mute">
        Buy-ins won per night, with two extra even nights counted so a one-off
        doesn&apos;t run the rail. The small number is nights sat.
      </p>

      {scope.allTime ? null : (
        <MonthPager monthKey={scope.monthParam} currentMonth={currentMonth} />
      )}

      {rows.length === 0 ? (
        <p className="text-mute">
          {scope.allTime
            ? "No settled nights yet."
            : "No settled nights this month yet."}
        </p>
      ) : (
        <ol className="glass flex flex-col overflow-hidden rounded-3xl">
          {rows.map((row, i) => (
            <li key={row.playerId} className="border-b border-ivory/8 last:border-b-0">
              <Link
                href={playerHref(row.playerId, scope.monthParam)}
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
                <span className="shrink-0 text-right">
                  <span
                    className={`font-display text-lg tabular ${
                      row.average > 0
                        ? "text-gold"
                        : row.average < 0
                          ? "text-clay"
                          : "text-mute"
                    }`}
                  >
                    {formatBuyIns(row.average)}
                  </span>
                  <span className="ml-2 text-sm tabular text-mute">
                    {row.games}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MonthPager({
  monthKey,
  currentMonth,
}: {
  monthKey: string;
  currentMonth: string;
}) {
  const prevMonth = shiftMonthKey(monthKey, -1);
  const nextMonth = shiftMonthKey(monthKey, 1);
  const canGoNext = compareMonthKeys(nextMonth, currentMonth) <= 0;

  return (
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
  );
}
