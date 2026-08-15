import Link from "next/link";
import { isUnlocked } from "@/app/actions";
import { LiveTable } from "@/components/LiveTable";
import { PokerChip } from "@/components/PokerChip";
import { isDbConfigured } from "@/lib/db";
import { getLiveGame, listRoster } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TablePage() {
  if (!isDbConfigured()) return <SetupNotice />;

  const game = await getLiveGame();
  if (!game) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-6 py-10">
        <div className="relative mx-auto h-28 w-40">
          <div className="playing-card absolute left-6 top-2 h-24 w-16 -rotate-12" />
          <div className="playing-card absolute right-6 top-2 flex h-24 w-16 rotate-12 items-center justify-center text-2xl text-clay">
            ♥
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <PokerChip size={48} />
          </span>
        </div>
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            House table
          </p>
          <h1 className="font-display text-5xl leading-none tracking-tight">
            No one is seated
          </h1>
          <p className="mt-3 text-mute">
            Open a night, lock it with a PIN, and keep the buy-ins honest.
          </p>
        </div>
        <Link
          href="/new"
          className="btn-primary flex h-14 items-center justify-center text-sm font-semibold"
        >
          New game
        </Link>
      </div>
    );
  }

  const [unlocked, roster] = await Promise.all([
    isUnlocked(game.id),
    listRoster(),
  ]);

  return <LiveTable game={game} unlocked={unlocked} roster={roster} />;
}

function SetupNotice() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 py-10">
      <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
        Setup
      </p>
      <h1 className="font-display text-4xl tracking-tight">The table needs a vault</h1>
      <p className="text-sm text-mute">
        Copy <code className="text-ivory">.env.example</code> to{" "}
        <code className="text-ivory">.env.local</code>, add a Neon{" "}
        <code className="text-ivory">DATABASE_URL</code> and{" "}
        <code className="text-ivory">SESSION_SECRET</code>, then run{" "}
        <code className="text-ivory">npm run db:push</code> and{" "}
        <code className="text-ivory">npm run db:seed</code>.
      </p>
    </div>
  );
}
