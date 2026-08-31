"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath, refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import {
  applyEarlyTransfers,
  chipConservation,
  minTransfers,
  moneyDiff,
  ownEarlyTransfer,
  remainingObligation,
  scoreSeats,
} from "@/lib/ledger";
import { getDb } from "@/lib/db";
import { gamePlayers, games, players, transfers } from "@/lib/db/schema";
import {
  BOARD_CACHE_TAG,
  LIVE_GAME_TAG,
  ROSTER_CACHE_TAG,
  SETTLED_GAME_TAG,
  getGame,
  getLiveGame,
  warmBoardCache,
} from "@/lib/db/queries";
import {
  getLoggedInPlayer,
  mintUserSession,
  userCookieName,
  userCookieOptions,
} from "@/lib/auth";
import { hashPin, isFourDigitPin, verifyPin } from "@/lib/pin";
import { isUsablePassword, verifyPassword } from "@/lib/password";
import {
  mintSession,
  readSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { isUpiId, normalizeUpiId } from "@/lib/upi";

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

export async function refreshBoardCache() {
  updateTag(BOARD_CACHE_TAG);
  refresh();
}

export async function refreshLiveCache() {
  updateTag(LIVE_GAME_TAG);
  refresh();
}

export async function warmBoardAfterSettle(playerIds: string[], gameId: string) {
  await warmBoardCache(playerIds, gameId);
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

async function findOrCreatePlayer(
  name: string,
): Promise<{ id: string; created: boolean }> {
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
  if (existing) return { id: existing.id, created: false };

  const [created] = await db
    .insert(players)
    .values({ name: trimmed, aliases: [] })
    .returning({ id: players.id });
  return { id: created.id, created: true };
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
  let rosterChanged = false;
  for (const seat of input.seats) {
    const player = await findOrCreatePlayer(seat.name);
    if (player.created) rosterChanged = true;
    if (seen.has(player.id)) continue;
    seen.add(player.id);
    rows.push({ gameId: game.id, playerId: player.id, buyIns: seat.buyIns });
  }
  if (rows.length < 2) {
    await db.delete(games).where(eq(games.id, game.id));
    return { ok: false, error: "Need at least two distinct players." };
  }
  await db.insert(gamePlayers).values(rows);
  await setUnlockCookie(game.id);
  revalidateAll(game.id);
  updateTag(LIVE_GAME_TAG);
  if (rosterChanged) updateTag(ROSTER_CACHE_TAG);
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
        isNull(gamePlayers.cashedOutAt),
        delta < 0
          ? sql`${gamePlayers.buyIns} >= ${-delta}`
          : sql`true`,
      ),
    )
    .returning({ buyIns: gamePlayers.buyIns });

  if (!updated) {
    return { ok: false, error: "Cannot change that buy-in — they may have cashed out." };
  }
  revalidateAll(gameId);
  updateTag(LIVE_GAME_TAG);
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

  const player = await findOrCreatePlayer(name);
  const db = getDb();
  try {
    await db
      .insert(gamePlayers)
      .values({ gameId, playerId: player.id, buyIns });
  } catch {
    return { ok: false, error: "That player is already on the table." };
  }
  revalidateAll(gameId);
  updateTag(LIVE_GAME_TAG);
  if (player.created) updateTag(ROSTER_CACHE_TAG);
  return { ok: true };
}

export async function cashOutPlayer(
  gameId: string,
  playerId: string,
  finalStack: number,
  counterpartyId?: string | null,
): Promise<ActionResult> {
  const gate = await requireEdit(gameId);
  if (gate) return gate;
  if (!Number.isFinite(finalStack) || finalStack < 0) {
    return { ok: false, error: "Chip count must be zero or more." };
  }

  const game = await getGame(gameId);
  if (!game) return { ok: false, error: "Game not found." };
  const seat = game.players.find((p) => p.playerId === playerId);
  if (!seat) return { ok: false, error: "That player is not on this table." };
  if (seat.cashedOutAt) {
    return { ok: false, error: "They already cashed out." };
  }

  const diff = moneyDiff(
    finalStack,
    seat.buyIns,
    game.stackValue,
    game.buyInCash,
  );
  const owed = remainingObligation(
    diff,
    game.transfers.filter((t) => t.source === "early_cashout"),
    playerId,
  );
  if (owed !== 0) {
    if (!counterpartyId || counterpartyId === playerId) {
      return { ok: false, error: "Pick who they settled with." };
    }
    const other = game.players.find((p) => p.playerId === counterpartyId);
    if (!other) {
      return { ok: false, error: "That player is not on this table." };
    }
  }

  const db = getDb();
  const [updated] = await db
    .update(gamePlayers)
    .set({
      finalStack,
      moneyDiff: diff,
      cashedOutAt: new Date(),
    })
    .where(
      and(
        eq(gamePlayers.gameId, gameId),
        eq(gamePlayers.playerId, playerId),
        isNull(gamePlayers.cashedOutAt),
      ),
    )
    .returning({ playerId: gamePlayers.playerId });
  if (!updated) {
    return { ok: false, error: "They already cashed out." };
  }

  if (owed !== 0 && counterpartyId) {
    await db.insert(transfers).values({
      gameId,
      fromPlayerId: owed < 0 ? playerId : counterpartyId,
      toPlayerId: owed < 0 ? counterpartyId : playerId,
      amount: Math.abs(owed),
      source: "early_cashout",
    });
  }

  revalidateAll(gameId);
  updateTag(LIVE_GAME_TAG);
  return { ok: true };
}

export async function undoCashOut(
  gameId: string,
  playerId: string,
): Promise<ActionResult> {
  const gate = await requireEdit(gameId);
  if (gate) return gate;

  const game = await getGame(gameId);
  if (!game) return { ok: false, error: "Game not found." };
  const seat = game.players.find((p) => p.playerId === playerId);
  if (!seat?.cashedOutAt) {
    return { ok: false, error: "That player is still seated." };
  }

  const latest = game.players
    .filter((p) => p.cashedOutAt)
    .reduce((best, p) =>
      p.cashedOutAt!.getTime() > best.cashedOutAt!.getTime() ? p : best,
    );
  if (latest.playerId !== playerId) {
    return { ok: false, error: "Undo the later cash-outs first." };
  }

  const own = ownEarlyTransfer(
    playerId,
    game.players,
    game.transfers.filter((t) => t.source === "early_cashout"),
  );

  const db = getDb();
  const [updated] = await db
    .update(gamePlayers)
    .set({
      finalStack: null,
      moneyDiff: null,
      cashedOutAt: null,
    })
    .where(
      and(
        eq(gamePlayers.gameId, gameId),
        eq(gamePlayers.playerId, playerId),
        sql`${gamePlayers.cashedOutAt} is not null`,
      ),
    )
    .returning({ playerId: gamePlayers.playerId });
  if (!updated) {
    return { ok: false, error: "That player is still seated." };
  }

  if (own?.id) {
    await db.delete(transfers).where(eq(transfers.id, own.id));
  }

  revalidateAll(gameId);
  updateTag(LIVE_GAME_TAG);
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
  const remaining = game.players.filter((seat) => !seat.cashedOutAt);
  const early = game.players.filter((seat) => seat.cashedOutAt);

  for (const seat of remaining) {
    const value = stackMap.get(seat.playerId);
    if (value === undefined || !Number.isFinite(value) || value < 0) {
      return { ok: false, error: `Missing chip count for ${seat.name}.` };
    }
  }
  for (const seat of early) {
    if (seat.finalStack == null) {
      return { ok: false, error: `Missing chip count for ${seat.name}.` };
    }
  }

  const scored = scoreSeats(
    [
      ...remaining.map((seat) => ({
        playerId: seat.playerId,
        name: seat.name,
        buyIns: seat.buyIns,
        finalStack: stackMap.get(seat.playerId)!,
      })),
      ...early.map((seat) => ({
        playerId: seat.playerId,
        name: seat.name,
        buyIns: seat.buyIns,
        finalStack: seat.finalStack!,
      })),
    ],
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

  const remainingScored = scored.filter((seat) =>
    remaining.some((r) => r.playerId === seat.playerId),
  );
  const earlyMoves = game.transfers.filter((t) => t.source === "early_cashout");
  const pays =
    remaining.length === 0
      ? []
      : minTransfers(applyEarlyTransfers(remainingScored, earlyMoves));
  const db = getDb();

  for (const seat of remainingScored) {
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
        source: "settle" as const,
      })),
    );
  }

  await db
    .update(games)
    .set({ status: "settled" })
    .where(eq(games.id, gameId));

  revalidateAll(gameId);
  updateTag(BOARD_CACHE_TAG);
  updateTag(LIVE_GAME_TAG);
  return { ok: true };
}

export async function login(
  username: string,
  password: string,
): Promise<ActionResult<{ hasUpi: boolean }>> {
  const handle = username.trim().toLowerCase();
  if (!handle || !isUsablePassword(password)) {
    return { ok: false, error: "Wrong username or password." };
  }

  const db = getDb();
  const [person] = await db
    .select({
      id: players.id,
      passwordHash: players.passwordHash,
      upiId: players.upiId,
    })
    .from(players)
    .where(eq(players.username, handle))
    .limit(1);

  if (!person?.passwordHash) {
    return { ok: false, error: "Wrong username or password." };
  }

  const match = await verifyPassword(password, person.passwordHash);
  if (!match) {
    return { ok: false, error: "Wrong username or password." };
  }

  (await cookies()).set(
    userCookieName(),
    mintUserSession(person.id),
    userCookieOptions,
  );
  revalidatePath("/", "layout");
  return { ok: true, hasUpi: Boolean(person.upiId) };
}

export async function logout(): Promise<ActionResult> {
  (await cookies()).set(userCookieName(), "", {
    ...userCookieOptions,
    maxAge: 0,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveUpi(upiId: string): Promise<ActionResult> {
  const player = await getLoggedInPlayer();
  if (!player) {
    return { ok: false, error: "Log in to save a UPI ID." };
  }
  const normalized = normalizeUpiId(upiId);
  if (!isUpiId(normalized)) {
    return { ok: false, error: "That doesn’t look like a UPI ID." };
  }

  const db = getDb();
  await db
    .update(players)
    .set({ upiId: normalized })
    .where(eq(players.id, player.id));

  updateTag(ROSTER_CACHE_TAG);
  updateTag(SETTLED_GAME_TAG);
  updateTag(LIVE_GAME_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/me");
  revalidatePath("/history");
  revalidatePath("/game", "layout");
  return { ok: true };
}
