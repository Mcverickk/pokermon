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

export function formatNight(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
