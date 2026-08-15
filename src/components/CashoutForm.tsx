"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { settleGame, unlockGame, warmBoardAfterSettle } from "@/app/actions";
import type { GameDetail } from "@/lib/db/queries";
import { chipConservation, chips, inr } from "@/lib/ledger";
import { PinPad } from "./PinPad";
import { RefreshButton } from "./RefreshButton";

export function CashoutForm({
  game,
  unlocked,
}: {
  game: GameDetail;
  unlocked: boolean;
}) {
  const router = useRouter();
  const [stacks, setStacks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      game.players.map((p) => [
        p.playerId,
        p.finalStack != null ? String(p.finalStack) : "",
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const parsed = useMemo(
    () =>
      game.players.map((p) => ({
        buyIns: p.buyIns,
        finalStack: Number(stacks[p.playerId] || 0),
      })),
    [game.players, stacks],
  );

  const conservation = chipConservation(parsed, game.stackValue);
  const allFilled = game.players.every(
    (p) => stacks[p.playerId] !== "" && Number(stacks[p.playerId]) >= 0,
  );

  function submit() {
    setError(null);
    if (!unlocked) {
      setPinOpen(true);
      return;
    }
    start(async () => {
      const result = await settleGame(
        game.id,
        game.players.map((p) => ({
          playerId: p.playerId,
          finalStack: Number(stacks[p.playerId]),
        })),
      );
      if (!result.ok) {
        setError(result.error);
        if (result.needsPin) setPinOpen(true);
        return;
      }
      await warmBoardAfterSettle(
        game.players.map((p) => p.playerId),
        game.id,
      );
      router.push(`/game/${game.id}/settle`);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            Cash out
          </p>
          <h1 className="font-display text-4xl tracking-tight">Count the tray</h1>
          <p className="mt-1 text-sm text-mute">
            Final chips, not rupees. Stack was {chips(game.stackValue)} each.
          </p>
        </div>
        <RefreshButton className="mt-1" scope="live" />
      </header>

      <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
        {game.players.map((seat) => (
          <li
            key={seat.playerId}
            className="glass flex items-center gap-3 rounded-3xl px-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg tracking-tight">{seat.name}</p>
              <p className="text-xs text-mute">
                {seat.buyIns} buy-in{seat.buyIns === 1 ? "" : "s"} · issued{" "}
                {chips(seat.buyIns * game.stackValue)}
              </p>
            </div>
            <input
              inputMode="numeric"
              value={stacks[seat.playerId]}
              onChange={(e) =>
                setStacks((cur) => ({
                  ...cur,
                  [seat.playerId]: e.target.value.replace(/[^\d]/g, ""),
                }))
              }
              placeholder="0"
              className="w-28 rounded-2xl bg-ivory/8 px-3 py-2 text-right font-display text-2xl tabular text-ivory outline-none"
            />
          </li>
        ))}
      </ul>

      <div
        className={`glass rounded-2xl px-4 py-3 text-sm ${
          !allFilled
            ? "text-mute"
            : conservation.ok
              ? "text-gold"
              : "text-clay"
        }`}
      >
        {allFilled ? (
          conservation.ok ? (
            <p>Chips match the buy-ins. The table is square.</p>
          ) : (
            <p>
              Mismatch: counted {chips(conservation.finalTotal)}, issued{" "}
              {chips(conservation.buyInTotal)} (Δ {chips(conservation.delta)}).
              Fix a stack or a missed buy-in before settling.
            </p>
          )
        ) : (
          <p>Enter every stack. Missing chips usually mean a missed buy-in.</p>
        )}
      </div>

      {error ? <p className="text-sm text-clay">{error}</p> : null}

      <button
        type="button"
        disabled={pending || !allFilled || !conservation.ok}
        onClick={submit}
        className="btn-primary h-14 text-sm font-semibold disabled:opacity-40 lg:max-w-xs"
      >
        {pending ? "Settling…" : `Settle · ${inr(game.buyInCash)} buy-in`}
      </button>

      {pinOpen ? (
        <PinPad
          title="Unlock to settle"
          error={pinError}
          busy={pending}
          onSubmit={(pin) => {
            start(async () => {
              const result = await unlockGame(game.id, pin);
              if (!result.ok) {
                setPinError(result.error);
                return;
              }
              setPinOpen(false);
              router.refresh();
            });
          }}
          onCancel={() => setPinOpen(false)}
        />
      ) : null}
    </div>
  );
}
