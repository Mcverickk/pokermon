import { Chevron } from "@/components/Chevron";
import { RefreshButton } from "@/components/RefreshButton";
import { isDbConfigured } from "@/lib/db";
import { listSettledGames } from "@/lib/db/queries";
import { formatNight, inr } from "@/lib/ledger";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!isDbConfigured()) {
    return <p className="text-mute">Set up the database first.</p>;
  }

  const nights = await listSettledGames();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            The book
          </p>
          <h1 className="font-display text-4xl tracking-tight">Nights</h1>
          <p className="mt-1 text-sm text-mute">
            Open a night for the receipt.
          </p>
        </div>
        <RefreshButton className="mt-1" scope="board" />
      </header>
      <Link
        href="/new"
        className="btn-ghost flex h-12 items-center justify-center text-sm font-medium lg:max-w-xs"
      >
        New game
      </Link>

      {nights.length === 0 ? (
        <p className="text-mute">No nights in the book yet. Settle a table first.</p>
      ) : (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
          {nights.map((night) => (
            <li key={night.id}>
              <Link
                href={`/game/${night.id}/settle`}
                aria-label={`${formatNight(night.playedOn)} receipt`}
                className="group glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-ivory/6"
              >
                <span className="font-display text-lg tracking-tight">
                  {formatNight(night.playedOn)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm tabular text-gold">
                    {inr(night.handle)} · {night.playerCount}
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
