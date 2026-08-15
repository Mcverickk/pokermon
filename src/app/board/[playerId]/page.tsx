import { getPlayerName, getPlayerNights } from "@/lib/db/queries";
import { formatNight, inr } from "@/lib/ledger";
import Link from "next/link";
import { notFound } from "next/navigation";

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
      <header>
        <h1 className="font-display text-4xl tracking-tight">{name}</h1>
        <p
          className={`mt-1 font-display text-2xl tabular ${
            net > 0 ? "text-gold" : net < 0 ? "text-clay" : "text-mute"
          }`}
        >
          {net > 0 ? "+" : net < 0 ? "−" : ""}
          {inr(Math.abs(net))} lifetime
        </p>
      </header>
      {nights.length === 0 ? (
        <p className="text-mute">No settled nights yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {nights.map((night) => (
            <li key={night.gameId}>
              <Link
                href={`/game/${night.gameId}/settle`}
                className="glass flex items-baseline justify-between rounded-2xl px-4 py-3"
              >
                <span>{formatNight(night.playedOn)}</span>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
