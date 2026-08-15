import Link from "next/link";
import { notFound } from "next/navigation";
import { Chevron } from "@/components/Chevron";
import { RefreshButton } from "@/components/RefreshButton";
import { getPlayerName, getPlayerNights } from "@/lib/db/queries";
import { formatNight, inr } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function PlayerBoardPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const name = await getPlayerName(playerId);
  if (!name) notFound();
  const nights = await getPlayerNights(playerId);
  const net = nights.reduce((sum, n) => sum + n.moneyDiff, 0);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/board" className="text-sm text-gold">
        ← Board
      </Link>
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight">{name}</h1>
          <p
            className={`mt-1 font-display text-2xl tabular ${
              net > 0 ? "text-gold" : net < 0 ? "text-clay" : "text-mute"
            }`}
          >
            {net > 0 ? "+" : net < 0 ? "−" : ""}
            {inr(Math.abs(net))} lifetime
          </p>
        </div>
        <RefreshButton className="mt-1" scope="board" />
      </header>
      {nights.length === 0 ? (
        <p className="text-mute">No settled nights yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
          {nights.map((night) => (
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
                      night.moneyDiff > 0
                        ? "text-gold"
                        : night.moneyDiff < 0
                          ? "text-clay"
                          : "text-mute"
                    }`}
                  >
                    {night.moneyDiff > 0 ? "+" : night.moneyDiff < 0 ? "−" : ""}
                    {inr(Math.abs(night.moneyDiff))}
                  </span>
                  <span className="text-mute transition-colors group-hover:text-gold">
                    <Chevron />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
