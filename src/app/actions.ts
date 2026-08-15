"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  chipConservation,
  minTransfers,
  scoreSeats,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";
import { gamePlayers, games, players, transfers } from "@/lib/db/schema";
import { getGame, getLiveGame } from "@/lib/db/queries";
import { hashPin, isFourDigitPin, verifyPin } from "@/lib/pin";
import {
  mintSession,
  readSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";

const FAIL_LIMIT = 5;
const LOCK_MS = 60_000;

type ActionError = { ok: false; error: string; needsPin?: boolean };
type ActionOk<T extends object = object> = { ok: true } & T;
type ActionResult<T extends object = object> = ActionOk<T> | ActionError;

async function unlockedGameId(): Promise<string | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  return readSession(token)?.gameId ?? null;
}

export async function isUnlocked(gameId: string): Promise<boolean> {
  return (await unlockedGameId()) === gameId;
}

async function requireEdit(gameId: string): Promise<ActionError | null> {
  if ((await unlockedGameId()) !== gameId) {
    return { ok: false, error: "Unlock this night to edit.", needsPin: true };
  }
  const db = getDb();
  const [game] = await db
    .select({ status: games.status })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!game) return { ok: false, error: "Game not found." };
  if (game.status !== "live") {
    return { ok: false, error: "This night is already settled." };
  }
  return null;
}

async function setUnlockCookie(gameId: string) {
  (await cookies()).set(
    sessionCookieName(),
    mintSession(gameId),
    sessionCookieOptions,
  );
}

function revalidateAll(gameId?: string) {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/board");
  if (gameId) {
    revalidatePath(`/game/${gameId}`);
    revalidatePath(`/game/${gameId}/cashout`);
    revalidatePath(`/game/${gameId}/settle`);
  }
}

export async function unlockGame(
  gameId: string,
  pin: string,
): Promise<ActionResult> {
  if (!isFourDigitPin(pin)) {
    return { ok: false, error: "PIN must be four digits." };
  }

  const db = getDb();
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) return { ok: false, error: "Game not found." };

  if (game.pinLockedUntil && game.pinLockedUntil.getTime() > Date.now()) {
    const seconds = Math.ceil(
      (game.pinLockedUntil.getTime() - Date.now()) / 1000,
    );
    return { ok: false, error: `Too many tries. Wait ${seconds}s.` };
  }

  const match = await verifyPin(pin, game.pinHash);
  if (!match) {
    const fails = game.pinFailCount + 1;
    const locked = fails >= FAIL_LIMIT ? new Date(Date.now() + LOCK_MS) : null;
    await db
      .update(games)
      .set({
        pinFailCount: locked ? 0 : fails,
        pinLockedUntil: locked,
      })
      .where(eq(games.id, gameId));
    return {
      ok: false,
      error: locked
        ? "Too many tries. Wait 60 seconds."
        : "Wrong PIN.",
    };
  }

  await db
    .update(games)
    .set({ pinFailCount: 0, pinLockedUntil: null })
    .where(eq(games.id, gameId));
  await setUnlockCookie(gameId);
  revalidateAll(gameId);
  return { ok: true };
}

async function findOrCreatePlayer(name: string): Promise<string> {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("Name is empty");
  const db = getDb();
  const roster = await db.select().from(players);
  const needle = trimmed.toLowerCase();
  const existing = roster.find(
    (person) =>
      person.name.toLowerCase() === needle ||
      (person.aliases ?? []).some((alias) => alias.toLowerCase() === needle),
  );
  if (existing) return existing.id;

  const [created] = await db
    .insert(players)
    .values({ name: trimmed, aliases: [] })
    .returning({ id: players.id });
  return created.id;
}

export async function createGame(input: {
  pin: string;
  pinConfirm: string;
  buyInCash: number;
  stackValue: number;
  seats: { name: string; buyIns: number }[];
}): Promise<ActionResult<{ gameId: string }>> {
  if (!isFourDigitPin(input.pin)) {
    return { ok: false, error: "PIN must be four digits." };
  }
  if (input.pin !== input.pinConfirm) {
    return { ok: false, error: "PINs do not match." };
  }
  if (input.buyInCash <= 0 || input.stackValue <= 0) {
    return { ok: false, error: "Buy-in and stack must be greater than zero." };
  }
  if (input.seats.length < 2) {
    return { ok: false, error: "Need at least two players." };
  }
  for (const seat of input.seats) {
    if (!seat.name.trim() || seat.buyIns < 1) {
      return { ok: false, error: "Every player needs a name and at least one buy-in." };
    }
  }

  const live = await getLiveGame();
  if (live) {
    return {
      ok: false,
      error: "A night is already live. Settle it before starting another.",
    };
  }

  const db = getDb();
  const pinHash = await hashPin(input.pin);
  const [game] = await db
    .insert(games)
    .values({
      status: "live",
      pinHash,
      buyInCash: input.buyInCash,
      stackValue: input.stackValue,
    })
    .returning({ id: games.id });

  const rows: { gameId: string; playerId: string; buyIns: number }[] = [];
  const seen = new Set<string>();
  for (const seat of input.seats) {
    const playerId = await findOrCreatePlayer(seat.name);
    if (seen.has(playerId)) continue;
    seen.add(playerId);
    rows.push({ gameId: game.id, playerId, buyIns: seat.buyIns });
  }
  if (rows.length < 2) {
    await db.delete(games).where(eq(games.id, game.id));
    return { ok: false, error: "Need at least two distinct players." };
  }
  await db.insert(gamePlayers).values(rows);
  await setUnlockCookie(game.id);
  revalidateAll(game.id);
  return { ok: true, gameId: game.id };
}

export async function changeBuyIns(
  gameId: string,
  playerId: string,
  delta: 1 | -1,
): Promise<ActionResult<{ buyIns: number }>> {
  const gate = await requireEdit(gameId);
  if (gate) return gate;

  const db = getDb();
  const [updated] = await db
    .update(gamePlayers)
    .set({ buyIns: sql`${gamePlayers.buyIns} + ${delta}` })
    .where(
      and(
        eq(gamePlayers.gameId, gameId),
        eq(gamePlayers.playerId, playerId),
        delta < 0
          ? sql`${gamePlayers.buyIns} >= ${-delta}`
          : sql`true`,
      ),
    )
    .returning({ buyIns: gamePlayers.buyIns });

  if (!updated) {
    return { ok: false, error: "Cannot take that buy-in off." };
  }
  revalidateAll(gameId);
  return { ok: true, buyIns: updated.buyIns };
}

export async function addPlayerToGame(
  gameId: string,
  name: string,
  buyIns: number,
): Promise<ActionResult> {
  const gate = await requireEdit(gameId);
  if (gate) return gate;
  if (buyIns < 1) return { ok: false, error: "Start with at least one buy-in." };

  const playerId = await findOrCreatePlayer(name);
  const db = getDb();
  try {
    await db.insert(gamePlayers).values({ gameId, playerId, buyIns });
  } catch {
    return { ok: false, error: "That player is already on the table." };
  }
  revalidateAll(gameId);
  return { ok: true };
}

export async function settleGame(
  gameId: string,
  stacks: { playerId: string; finalStack: number }[],
): Promise<ActionResult> {
  const gate = await requireEdit(gameId);
  if (gate) return gate;

  const game = await getGame(gameId);
  if (!game) return { ok: false, error: "Game not found." };

  const stackMap = new Map(stacks.map((s) => [s.playerId, s.finalStack]));
  for (const seat of game.players) {
    const value = stackMap.get(seat.playerId);
    if (value === undefined || !Number.isFinite(value) || value < 0) {
      return { ok: false, error: `Missing chip count for ${seat.name}.` };
    }
  }

  const scored = scoreSeats(
    game.players.map((seat) => ({
      playerId: seat.playerId,
      name: seat.name,
      buyIns: seat.buyIns,
      finalStack: stackMap.get(seat.playerId)!,
    })),
    game.stackValue,
    game.buyInCash,
  );

  const chips = chipConservation(scored, game.stackValue);
  if (!chips.ok) {
    return {
      ok: false,
      error: `Chips don’t add up. Table has ${chips.finalTotal.toLocaleString("en-IN")}, buy-ins issued ${chips.buyInTotal.toLocaleString("en-IN")} (Δ ${chips.delta.toLocaleString("en-IN")}).`,
    };
  }

  const pays = minTransfers(scored);
  const db = getDb();

  for (const seat of scored) {
    await db
      .update(gamePlayers)
      .set({
        finalStack: seat.finalStack,
        moneyDiff: seat.moneyDiff,
      })
      .where(
        and(
          eq(gamePlayers.gameId, gameId),
          eq(gamePlayers.playerId, seat.playerId),
        ),
      );
  }

  if (pays.length) {
    await db.insert(transfers).values(
      pays.map((pay) => ({
        gameId,
        fromPlayerId: pay.fromId,
        toPlayerId: pay.toId,
        amount: pay.amount,
      })),
    );
  }

  await db
    .update(games)
    .set({ status: "settled" })
    .where(eq(games.id, gameId));

  revalidateAll(gameId);
  return { ok: true };
}
