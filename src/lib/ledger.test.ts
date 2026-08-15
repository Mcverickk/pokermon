import { describe, expect, it } from "vitest";
import {
  chipConservation,
  handleTotal,
  minTransfers,
  moneyDiff,
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
    const paid = new Map<string, number>();
    const received = new Map<string, number>();
    for (const t of transfers) {
      paid.set(t.fromId, (paid.get(t.fromId) ?? 0) + t.amount);
      received.set(t.toId, (received.get(t.toId) ?? 0) + t.amount);
    }
    for (const seat of seats) {
      const net = (received.get(seat.playerId) ?? 0) - (paid.get(seat.playerId) ?? 0);
      expect(net).toBe(seat.moneyDiff);
    }
    expect(transfers.length).toBeLessThanOrEqual(seats.filter((s) => s.moneyDiff !== 0).length - 1);
  });
});
