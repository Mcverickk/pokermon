export type SeatInput = {
  playerId: string;
  name: string;
  buyIns: number;
  finalStack: number;
};

export type SeatResult = SeatInput & {
  buyInStack: number;
  stackDiff: number;
  moneyDiff: number;
};

export type Transfer = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

export const CAGE_ID = "__cage__";
export const CAGE_NAME = "Cage";

export function buyInStack(buyIns: number, stackValue: number): number {
  return buyIns * stackValue;
}

export function stackDiff(
  finalStack: number,
  buyIns: number,
  stackValue: number,
): number {
  return finalStack - buyInStack(buyIns, stackValue);
}

export function moneyDiff(
  finalStack: number,
  buyIns: number,
  stackValue: number,
  buyInCash: number,
): number {
  if (stackValue === 0) return 0;
  return Math.round(
    stackDiff(finalStack, buyIns, stackValue) * (buyInCash / stackValue),
  );
}

export function handleTotal(totalBuyIns: number, buyInCash: number): number {
  return totalBuyIns * buyInCash;
}

export function scoreSeats(
  seats: SeatInput[],
  stackValue: number,
  buyInCash: number,
): SeatResult[] {
  return seats.map((seat) => ({
    ...seat,
    buyInStack: buyInStack(seat.buyIns, stackValue),
    stackDiff: stackDiff(seat.finalStack, seat.buyIns, stackValue),
    moneyDiff: moneyDiff(
      seat.finalStack,
      seat.buyIns,
      stackValue,
      buyInCash,
    ),
  }));
}

export function chipConservation(
  seats: { buyIns: number; finalStack: number }[],
  stackValue: number,
): { ok: boolean; buyInTotal: number; finalTotal: number; delta: number } {
  const buyInTotal = seats.reduce(
    (sum, seat) => sum + buyInStack(seat.buyIns, stackValue),
    0,
  );
  const finalTotal = seats.reduce((sum, seat) => sum + seat.finalStack, 0);
  return {
    ok: buyInTotal === finalTotal,
    buyInTotal,
    finalTotal,
    delta: finalTotal - buyInTotal,
  };
}

/** Greedy min-cash-flow: largest debtor pays largest creditor. */
export function minTransfers(seats: SeatResult[]): Transfer[] {
  const debtors = seats
    .filter((seat) => seat.moneyDiff < 0)
    .map((seat) => ({
      id: seat.playerId,
      name: seat.name,
      owe: -seat.moneyDiff,
    }))
    .sort((a, b) => b.owe - a.owe);

  const creditors = seats
    .filter((seat) => seat.moneyDiff > 0)
    .map((seat) => ({
      id: seat.playerId,
      name: seat.name,
      due: seat.moneyDiff,
    }))
    .sort((a, b) => b.due - a.due);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].owe, creditors[j].due);
    if (pay > 0) {
      transfers.push({
        fromId: debtors[i].id,
        fromName: debtors[i].name,
        toId: creditors[j].id,
        toName: creditors[j].name,
        amount: pay,
      });
      debtors[i].owe -= pay;
      creditors[j].due -= pay;
    }
    if (debtors[i].owe === 0) i += 1;
    if (creditors[j].due === 0) j += 1;
  }

  return transfers;
}

export function cageSeat(moneyDiff: number): SeatResult {
  return {
    playerId: CAGE_ID,
    name: CAGE_NAME,
    buyIns: 0,
    finalStack: 0,
    buyInStack: 0,
    stackDiff: 0,
    moneyDiff,
  };
}

/** Remaining seats plus the cage when early cash-outs left a tray imbalance. */
export function seatsWithCage(
  remaining: SeatResult[],
  early: SeatResult[],
): SeatResult[] {
  const cageMoney = early.reduce((sum, seat) => sum + seat.moneyDiff, 0);
  if (cageMoney === 0) return remaining;
  return [...remaining, cageSeat(cageMoney)];
}

export function formatReceipt(args: {
  playedOn: Date;
  buyInCash: number;
  stackValue: number;
  handle: number;
  seats: SeatResult[];
  transfers: Transfer[];
}): string {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(args.playedOn);

  const rupee = (n: number) =>
    `${n < 0 ? "−" : n > 0 ? "+" : ""}${inr(Math.abs(n))}`;

  const ranked = [...args.seats].sort((a, b) => b.moneyDiff - a.moneyDiff);
  const lines = [
    `POKERMON · ${date}`,
    `Handle ${inr(args.handle)} · ${inr(args.buyInCash)} buy-in · ${chips(args.stackValue)} stack`,
    "",
    ...ranked.map((seat) => `${seat.name}  ${rupee(seat.moneyDiff)}`),
    "",
    "Pay",
    ...(args.transfers.length
      ? args.transfers.map(
          (t) => `${t.fromName} → ${t.toName}  ${inr(t.amount)}`,
        )
      : ["No payments — even cage."]),
  ];
  return lines.join("\n");
}

export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function chips(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export const HOUSE_TZ = "Asia/Kolkata";

function istDateParts(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: HOUSE_TZ,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")!.value),
    month: Number(parts.find((part) => part.type === "month")!.value),
  };
}

export function currentMonthKey(): string {
  return monthKeyFromDate(new Date());
}

export function monthKeyFromDate(date: Date): string {
  const { year, month } = istDateParts(date);
  return toMonthKey(year, month);
}

export function parseMonthKey(
  key: string,
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function resolveMonthKey(param?: string | null): string {
  if (param && parseMonthKey(param)) return param;
  return currentMonthKey();
}

export function formatMonthLabel(key: string): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  const date = istMidnightToUtc(parsed.year, parsed.month, 15);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: HOUSE_TZ,
    month: "long",
    year: "numeric",
  }).format(date);
}

export function shiftMonthKey(key: string, delta: -1 | 1): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  let { year, month } = parsed;
  month += delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }
  return toMonthKey(year, month);
}

export function compareMonthKeys(a: string, b: string): number {
  const left = parseMonthKey(a);
  const right = parseMonthKey(b);
  if (!left || !right) return 0;
  if (left.year !== right.year) return left.year - right.year;
  return left.month - right.month;
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function istMidnightToUtc(year: number, month: number, day: number): Date {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`;
  return new Date(iso);
}

export function monthBoundsUtc(key: string): { start: Date; end: Date } {
  const parsed = parseMonthKey(key);
  if (!parsed) throw new Error(`Invalid month key: ${key}`);

  const start = istMidnightToUtc(parsed.year, parsed.month, 1);
  const next =
    parsed.month === 12
      ? { year: parsed.year + 1, month: 1 }
      : { year: parsed.year, month: parsed.month + 1 };
  const end = istMidnightToUtc(next.year, next.month, 1);

  return { start, end };
}

export function formatNight(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: HOUSE_TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
