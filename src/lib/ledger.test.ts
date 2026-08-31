import { describe, expect, it } from "vitest";
import {
  applyEarlyTransfers,
  cashOutLine,
  chipConservation,
  handleTotal,
  minTransfers,
  moneyDiff,
  ownEarlyTransfer,
  remainingObligation,
  scoreSeats,
} from "./ledger";

/** Bachatt Poker sheet — 11-08-2026, ₹500 buy-in / 5,000 stack. */
const STACK = 5000;
const CASH = 500;

const night = [
  { playerId: "murli", name: "Murli", buyIns: 1, finalStack: 16050 },
  { playerId: "chirag", name: "Chirag", buyIns: 4, finalStack: 3600 },
  { playerId: "ankush", name: "Ankush", buyIns: 5, finalStack: 11000 },
  { playerId: "rohit", name: "Rohit Yadav", buyIns: 1, finalStack: 29300 },
  { playerId: "buddha", name: "Buddha", buyIns: 2, finalStack: 25050 },
  { playerId: "aakarshit", name: "Aakarshit", buyIns: 5, finalStack: 0 },
  { playerId: "jai", name: "Jai", buyIns: 1, finalStack: 5000 },
  { playerId: "chinmay", name: "Chinmay", buyIns: 2, finalStack: 15000 },
];

function nets(transfers: { fromId: string; toId: string; amount: number }[]) {
  const paid = new Map<string, number>();
  const received = new Map<string, number>();
  for (const t of transfers) {
    paid.set(t.fromId, (paid.get(t.fromId) ?? 0) + t.amount);
    received.set(t.toId, (received.get(t.toId) ?? 0) + t.amount);
  }
  return { paid, received };
}

describe("sheet math 11-08-2026", () => {
  it("matches Money Diff column", () => {
    expect(moneyDiff(16050, 1, STACK, CASH)).toBe(1105);
    expect(moneyDiff(3600, 4, STACK, CASH)).toBe(-1640);
    expect(moneyDiff(11000, 5, STACK, CASH)).toBe(-1400);
    expect(moneyDiff(29300, 1, STACK, CASH)).toBe(2430);
    expect(moneyDiff(25050, 2, STACK, CASH)).toBe(1505);
    expect(moneyDiff(0, 5, STACK, CASH)).toBe(-2500);
    expect(moneyDiff(5000, 1, STACK, CASH)).toBe(0);
    expect(moneyDiff(15000, 2, STACK, CASH)).toBe(500);
  });

  it("conserves chips and nets to zero rupees", () => {
    const seats = scoreSeats(night, STACK, CASH);
    const chips = chipConservation(night, STACK);
    expect(chips.ok).toBe(true);
    expect(seats.reduce((sum, s) => sum + s.moneyDiff, 0)).toBe(0);
    expect(handleTotal(21, CASH)).toBe(10500);
  });

  it("settles with the fewest UPI transfers", () => {
    const seats = scoreSeats(night, STACK, CASH);
    const transfers = minTransfers(seats);
    const { paid, received } = nets(transfers);
    for (const seat of seats) {
      const net = (received.get(seat.playerId) ?? 0) - (paid.get(seat.playerId) ?? 0);
      expect(net).toBe(seat.moneyDiff);
    }
    expect(transfers.length).toBeLessThanOrEqual(
      seats.filter((s) => s.moneyDiff !== 0).length - 1,
    );
  });
});

describe("early cash-out to a player", () => {
  it("leaves min-transfers unchanged when nobody walked", () => {
    const seats = scoreSeats(night, STACK, CASH);
    expect(applyEarlyTransfers(seats, [])).toEqual(seats);
    expect(minTransfers(applyEarlyTransfers(seats, []))).toEqual(minTransfers(seats));
  });

  it("adds already-paid cash onto the payee still at the table", () => {
    const seats = scoreSeats(night, STACK, CASH);
    const remaining = seats.filter((s) => s.playerId !== "murli");
    const murli = seats.find((s) => s.playerId === "murli")!;
    expect(murli.moneyDiff).toBe(1105);

    const early = [
      {
        fromId: "chirag",
        toId: "murli",
        amount: murli.moneyDiff,
      },
    ];
    expect(remainingObligation(murli.moneyDiff, [], "murli")).toBe(1105);

    const adjusted = applyEarlyTransfers(remaining, early);
    const chirag = adjusted.find((s) => s.playerId === "chirag")!;
    expect(chirag.moneyDiff).toBe(
      remaining.find((s) => s.playerId === "chirag")!.moneyDiff + 1105,
    );
    expect(adjusted.reduce((sum, s) => sum + s.moneyDiff, 0)).toBe(0);

    const transfers = minTransfers(adjusted);
    expect(
      transfers.every((t) => t.fromId !== "murli" && t.toId !== "murli"),
    ).toBe(true);

    const { paid, received } = nets(transfers);
    for (const seat of adjusted) {
      const net =
        (received.get(seat.playerId) ?? 0) - (paid.get(seat.playerId) ?? 0);
      expect(net).toBe(seat.moneyDiff);
    }
  });

  it("rolls a prior cash-out into the next walker's remaining bill", () => {
    const seats = scoreSeats(night, STACK, CASH);
    const murli = seats.find((s) => s.playerId === "murli")!;
    const chirag = seats.find((s) => s.playerId === "chirag")!;
    const prior = [{ fromId: "chirag", toId: "murli", amount: murli.moneyDiff }];
    expect(remainingObligation(chirag.moneyDiff, prior, "chirag")).toBe(
      chirag.moneyDiff + murli.moneyDiff,
    );
  });

  it("names who pays whom on the cash-out line", () => {
    expect(cashOutLine("Murli", "Chirag", 1105)).toBe(
      "Chirag pays Murli ₹1,105",
    );
    expect(cashOutLine("Aakarshit", "Chirag", -2500)).toBe(
      "Aakarshit pays Chirag ₹2,500",
    );
    expect(cashOutLine("Jai", "Chirag", 0)).toBe("Even — no cash");
  });

  it("picks the walker's own transfer after they also banked someone else", () => {
    const t0 = new Date("2026-08-11T18:00:00.000Z");
    const t1 = new Date("2026-08-11T19:00:00.000Z");
    const seats = [
      { playerId: "murli", moneyDiff: 1105, cashedOutAt: t0 },
      { playerId: "chirag", moneyDiff: -1640, cashedOutAt: t1 },
    ];
    const transfers = [
      { fromId: "chirag", toId: "murli", fromName: "Chirag", toName: "Murli", amount: 1105 },
      { fromId: "chirag", toId: "buddha", fromName: "Chirag", toName: "Buddha", amount: 535 },
    ];
    expect(ownEarlyTransfer("murli", seats, transfers)?.toId).toBe("murli");
    expect(ownEarlyTransfer("chirag", seats, transfers)).toEqual(transfers[1]);
  });
});
