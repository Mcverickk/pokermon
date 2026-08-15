"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addPlayerToGame,
  changeBuyIns,
  unlockGame,
} from "@/app/actions";
import type { GameDetail, RosterPlayer } from "@/lib/db/queries";
import { chips, formatNight, handleTotal, inr } from "@/lib/ledger";
import { ChipStack } from "./PokerChip";
import { PinPad } from "./PinPad";
import { RefreshButton } from "./RefreshButton";

export function LiveTable({
  game,
  unlocked,
  roster,
}: {
  game: GameDetail;
  unlocked: boolean;
  roster: RosterPlayer[];
}) {
  const router = useRouter();
  const [pinOpen, setPinOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    playerId: string;
    name: string;
    from: number;
  } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const handle = handleTotal(
    game.players.reduce((sum, p) => sum + p.buyIns, 0),
    game.buyInCash,
  );

  function bump(playerId: string, name: string, buyIns: number, delta: 1 | -1) {
    setError(null);
    if (!unlocked) {
      setPinOpen(true);
      return;
    }
    if (delta === -1) {
      setConfirm({ playerId, name, from: buyIns });
      return;
    }
    start(async () => {
      const result = await changeBuyIns(game.id, playerId, 1);
      if (!result.ok) {
        setError(result.error);
        if (result.needsPin) setPinOpen(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            Live table
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            {formatNight(game.playedOn)}
          </h1>
          <p className="mt-1 text-sm text-mute">
            Handle <span className="tabular text-ivory">{inr(handle)}</span>
            {" · "}
            {inr(game.buyInCash)} / {chips(game.stackValue)}
          </p>
        </div>
        <RefreshButton className="mt-1" />
      </header>

      <div className="glass flex items-center justify-between rounded-full px-4 py-2.5">
        <span className="text-xs text-mute">
          {unlocked ? "This phone can edit" : "Watching"}
        </span>
        {unlocked ? (
          <span className="text-xs font-medium text-gold">Unlocked</span>
        ) : (
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="text-xs font-medium text-gold"
          >
            Unlock to edit
          </button>
        )}
      </div>

      {error ? <p className="text-sm text-clay">{error}</p> : null}

      <ul className="flex flex-col gap-3">
        {game.players.map((seat, i) => (
          <li
            key={seat.playerId}
            className="glass relative flex items-center gap-3 overflow-hidden rounded-3xl px-3 py-3"
          >
            <span className="pointer-events-none absolute -right-1 top-1 text-3xl opacity-[0.12]">
              {["♠", "♥", "♦", "♣"][i % 4]}
            </span>
            <ChipStack count={seat.buyIns} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl tracking-tight">
                {seat.name}
              </p>
              <p className="text-xs text-mute">
                {chips(seat.buyIns * game.stackValue)} chips
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  bump(seat.playerId, seat.name, seat.buyIns, -1)
                }
                className="btn-ghost h-11 w-11 text-2xl leading-none disabled:opacity-40"
                aria-label={`Remove buy-in from ${seat.name}`}
              >
                −
              </button>
              <span className="w-8 text-center font-display text-3xl tabular">
                {seat.buyIns}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => bump(seat.playerId, seat.name, seat.buyIns, 1)}
                className="btn-ghost h-11 w-11 text-2xl leading-none disabled:opacity-40"
                aria-label={`Add buy-in for ${seat.name}`}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            if (!unlocked) {
              setPinOpen(true);
              return;
            }
            setAddOpen(true);
          }}
          className="btn-ghost h-12 text-sm font-medium"
        >
          Add player
        </button>
        <Link
          href={unlocked ? `/game/${game.id}/cashout` : "#"}
          onClick={(e) => {
            if (!unlocked) {
              e.preventDefault();
              setPinOpen(true);
            }
          }}
          className="btn-primary flex h-14 items-center justify-center text-sm font-semibold"
        >
          End game · cash out
        </Link>
      </div>

      {pinOpen ? (
        <PinPad
          title="Unlock the cage"
          hint="The PIN set when this night started."
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
              setPinError(null);
              router.refresh();
            });
          }}
          onCancel={() => {
            setPinOpen(false);
            setPinError(null);
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmStrip
          text={`Take one buy-in off ${confirm.name}? ${confirm.from} → ${confirm.from - 1}`}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const id = confirm.playerId;
            setConfirm(null);
            start(async () => {
              const result = await changeBuyIns(game.id, id, -1);
              if (!result.ok) {
                setError(result.error);
                if (result.needsPin) setPinOpen(true);
              }
            });
          }}
        />
      ) : null}

      {addOpen ? (
        <AddPlayer
          roster={roster.filter(
            (p) => !game.players.some((s) => s.playerId === p.id),
          )}
          pending={pending}
          onClose={() => setAddOpen(false)}
          onAdd={(name, buyIns) => {
            start(async () => {
              const result = await addPlayerToGame(game.id, name, buyIns);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setAddOpen(false);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function ConfirmStrip({
  text,
  pending,
  onConfirm,
  onCancel,
}: {
  text: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
      <div className="glass-strong rounded-3xl p-4">
        <p className="text-sm text-ivory">{text}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost h-11 text-sm font-medium"
          >
            Keep it
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="btn-primary h-11 text-sm font-semibold"
          >
            Take it off
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPlayer({
  roster,
  pending,
  onAdd,
  onClose,
}: {
  roster: RosterPlayer[];
  pending: boolean;
  onAdd: (name: string, buyIns: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [buyIns, setBuyIns] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-felt-deep/70 p-4 backdrop-blur-md">
      <div className="glass-strong w-full rounded-3xl p-5">
        <p className="font-display text-3xl tracking-tight">Pull up a chair</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {roster.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setName(p.name)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                name === p.name
                  ? "bg-gold/20 text-gold"
                  : "bg-ivory/8 text-ivory"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Or type a new name"
          className="mt-3 w-full rounded-2xl bg-ivory/8 px-4 py-3 text-ivory placeholder:text-mute"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-mute">Buy-ins</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBuyIns((n) => Math.max(1, n - 1))}
              className="btn-ghost h-9 w-9"
            >
              −
            </button>
            <span className="w-6 text-center font-display text-xl tabular">
              {buyIns}
            </span>
            <button
              type="button"
              onClick={() => setBuyIns((n) => n + 1)}
              className="btn-ghost h-9 w-9"
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-12 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => onAdd(name.trim(), buyIns)}
            className="btn-primary h-12 text-sm font-semibold disabled:opacity-40"
          >
            Seat them
          </button>
        </div>
      </div>
    </div>
  );
}
