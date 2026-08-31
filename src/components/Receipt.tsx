import Link from "next/link";
import type { GameDetail, GameTransfer } from "@/lib/db/queries";
import { formatNight, handleTotal, inr, scoreSeats } from "@/lib/ledger";
import { RefreshButton } from "./RefreshButton";

export function Receipt({ game }: { game: GameDetail }) {
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
  const cashedIds = new Set(
    game.players.filter((p) => p.cashedOutAt).map((p) => p.playerId),
  );
  const earlyPays = game.transfers.filter((t) => t.source === "early_cashout");
  const tablePays = game.transfers.filter((t) => t.source !== "early_cashout");
  const handle = handleTotal(
    game.players.reduce((sum, p) => sum + p.buyIns, 0),
    game.buyInCash,
  );
  const night = formatNight(game.playedOn);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
            Settled
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            {night}
          </h1>
        </div>
        <RefreshButton className="mt-1" />
      </header>

      <article
        aria-label="Ace of spades receipt"
        className="playing-card relative mx-auto flex min-h-[26rem] w-full max-w-md flex-col justify-center overflow-hidden px-11 py-16"
        style={{ background: "#f7f2ea", color: "#1b1714" }}
      >
        <AceIndex className="absolute left-3 top-3" />
        <AceIndex className="absolute bottom-3 right-3 rotate-180" />
        <SpadePip
          className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2"
          style={{ color: "rgba(27, 23, 20, 0.12)" }}
        />

        <div className="relative">
          <p className="text-center text-sm">
            Handle {inr(handle)} · {inr(game.buyInCash)} buy-in
          </p>
          <ul
            className="mt-4 border-y py-3"
            style={{ borderColor: "rgba(15, 31, 22, 0.1)" }}
          >
            {ranked.map((seat) => (
              <li
                key={seat.playerId}
                className="flex justify-between py-0.5 font-display text-base tabular"
              >
                <span>
                  {seat.name}
                  {cashedIds.has(seat.playerId) ? (
                    <span className="ml-1 text-[10px] font-medium tracking-wide uppercase" style={{ color: "#8fa396" }}>
                      cashed out
                    </span>
                  ) : null}
                </span>
                <span>
                  {seat.moneyDiff > 0 ? "+" : seat.moneyDiff < 0 ? "−" : ""}
                  {inr(Math.abs(seat.moneyDiff))}
                </span>
              </li>
            ))}
          </ul>
          {earlyPays.length ? (
            <>
              <p
                className="mt-3 text-xs font-medium tracking-[0.18em] uppercase"
                style={{ color: "#8fa396" }}
              >
                Already paid
              </p>
              <ul className="mt-1">
                {earlyPays.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between text-sm tabular"
                  >
                    <span>
                      {t.fromName} → {t.toName}
                    </span>
                    <span>{inr(t.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p
            className="mt-3 text-xs font-medium tracking-[0.18em] uppercase"
            style={{ color: "#8fa396" }}
          >
            Pay
          </p>
          {tablePays.length ? (
            <ul className="mt-1">
              {tablePays.map((t) => (
                <SettlePayRow
                  key={t.id}
                  gameId={game.id}
                  transfer={t}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm">
              {earlyPays.length
                ? "No leftover payments — already square."
                : "No payments — even table."}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

function SettlePayRow({
  gameId,
  transfer,
}: {
  gameId: string;
  transfer: GameTransfer;
}) {
  return (
    <li className="py-0.5 text-sm">
      <div className="flex justify-between tabular">
        <span>
          {transfer.fromName} → {transfer.toName}
        </span>
        <span>{inr(transfer.amount)}</span>
      </div>
      {transfer.toUpiId ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px]" style={{ color: "#8fa396" }}>
            {transfer.toUpiId}
          </span>
          <Link
            href={`/game/${gameId}/pay/${transfer.id}`}
            className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
            style={{ background: "#c43b3b", color: "#f4eee4" }}
          >
            Pay
          </Link>
        </div>
      ) : (
        <p className="mt-0.5 text-[11px]" style={{ color: "#8fa396" }}>
          Waiting on their UPI
        </p>
      )}
    </li>
  );
}

function AceIndex({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex flex-col items-center leading-none ${className}`}
      style={{ color: "#1b1714" }}
      aria-hidden
    >
      <span className="font-display text-[1.65rem] font-semibold tracking-tight">
        A
      </span>
      <SpadePip className="mt-0.5 h-4 w-4" />
    </span>
  );
}

function SpadePip({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C12 2 3.2 9.4 3.2 14.6c0 2.7 2 4.4 4.4 4.4 1.2 0 2.3-.5 3.2-1.4v4.4H13.2v-4.4c.9.9 2 1.4 3.2 1.4 2.4 0 4.4-1.7 4.4-4.4C20.8 9.4 12 2 12 2z" />
    </svg>
  );
}
