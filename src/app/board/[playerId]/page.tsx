import Link from "next/link";
import { notFound } from "next/navigation";
import { Chevron } from "@/components/Chevron";
import { RefreshButton } from "@/components/RefreshButton";
import { getPlayerName, getPlayerNights } from "@/lib/db/queries";
import {
  formatBuyIns,
  formatMonthLabel,
  formatNight,
  leaderboardAverage,
  nightBuyInProfit,
  resolveBoardScope,
} from "@/lib/ledger";

export const dynamic = "force-dynamic";

function boardHref(monthParam: string) {
  return `/board?month=${monthParam}`;
}

export default async function PlayerBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { playerId } = await params;
  const { month: monthParam } = await searchParams;
  const scope = resolveBoardScope(monthParam);
  const name = await getPlayerName(playerId);
  if (!name) notFound();
  const nights = await getPlayerNights(
    playerId,
    scope.allTime ? undefined : scope.monthParam,
  );
  const won = nights.reduce(
    (sum, night) => sum + nightBuyInProfit(night.moneyDiff, night.buyInCash),
    0,
  );
  const average = leaderboardAverage(won, nights.length);

  return (
    <div className="flex flex-col gap-5">
      <Link href={boardHref(scope.monthParam)} className="text-sm text-gold">
        ← Board
      </Link>
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight">{name}</h1>
          <p className="mt-1 text-sm text-mute">
            {scope.allTime ? "All time" : formatMonthLabel(scope.monthParam)}
          </p>
          <p
            className={`mt-1 font-display text-2xl tabular ${
              average > 0 ? "text-gold" : average < 0 ? "text-clay" : "text-mute"
            }`}
          >
            {formatBuyIns(average)}
          </p>
          <p className="mt-1 text-sm text-mute">
            {nights.length} {nights.length === 1 ? "night" : "nights"}
          </p>
        </div>
        <RefreshButton className="mt-1" scope="board" />
      </header>
      {nights.length === 0 ? (
        <p className="text-mute">
          {scope.allTime
            ? "No settled nights yet."
            : "No settled nights this month."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
          {nights.map((night) => {
            const profit = nightBuyInProfit(night.moneyDiff, night.buyInCash);
            return (
              <li key={night.gameId}>
                <Link
                  href={`/game/${night.gameId}/settle`}
                  aria-label={`${formatNight(night.playedOn)} receipt`}
                  className="group glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-ivory/6"
                >
                  <span>{formatNight(night.playedOn)}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`tabular ${
                        profit > 0
                          ? "text-gold"
                          : profit < 0
                            ? "text-clay"
                            : "text-mute"
                      }`}
                    >
                      {formatBuyIns(profit)}
                    </span>
                    <span className="text-mute transition-colors group-hover:text-gold">
                      <Chevron />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
