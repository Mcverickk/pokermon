"use client";

import { useState } from "react";
import type { GameDetail } from "@/lib/db/queries";
import {
  formatNight,
  formatReceipt,
  handleTotal,
  inr,
  scoreSeats,
} from "@/lib/ledger";
import { RefreshButton } from "./RefreshButton";

export function Receipt({ game }: { game: GameDetail }) {
  const [copied, setCopied] = useState(false);
  const seats = scoreSeats(
    game.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      buyIns: p.buyIns,
      finalStack: p.finalStack ?? 0,
    })),
    game.stackValue,
    game.buyInCash,
  );
  const ranked = [...seats].sort((a, b) => b.moneyDiff - a.moneyDiff);
  const handle = handleTotal(
    game.players.reduce((sum, p) => sum + p.buyIns, 0),
    game.buyInCash,
  );
  const text = formatReceipt({
    playedOn: game.playedOn,
    buyInCash: game.buyInCash,
    stackValue: game.stackValue,
    handle,
    seats,
    transfers: game.transfers,
  });

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            Settled
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            {formatNight(game.playedOn)}
          </h1>
        </div>
        <RefreshButton className="mt-1" />
      </header>

      <article className="playing-card relative overflow-hidden px-5 py-5">
        <span className="absolute left-3 top-3 text-lg text-clay">♥</span>
        <span className="absolute right-3 bottom-3 rotate-180 text-lg text-clay">♥</span>
        <p className="text-center text-xs font-medium tracking-[0.22em] uppercase text-mute">
          Pokermon
        </p>
        <p className="mt-1 text-center text-sm">
          Handle {inr(handle)} · {inr(game.buyInCash)} buy-in
        </p>
        <ul className="mt-4 border-y border-felt/10 py-3">
          {ranked.map((seat) => (
            <li
              key={seat.playerId}
              className="flex justify-between py-0.5 font-display text-base tabular"
            >
              <span>{seat.name}</span>
              <span>
                {seat.moneyDiff > 0 ? "+" : seat.moneyDiff < 0 ? "−" : ""}
                {inr(Math.abs(seat.moneyDiff))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-medium tracking-[0.18em] uppercase text-mute">
          Pay
        </p>
        {game.transfers.length ? (
          <ul className="mt-1">
            {game.transfers.map((t) => (
              <li
                key={`${t.fromId}-${t.toId}-${t.amount}`}
                className="flex justify-between text-sm tabular"
              >
                <span>
                  {t.fromName} → {t.toName}
                </span>
                <span>{inr(t.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm">No payments — even table.</p>
        )}
      </article>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="btn-ghost h-12 text-sm font-medium"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="btn-primary flex h-12 items-center justify-center text-sm font-semibold"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
