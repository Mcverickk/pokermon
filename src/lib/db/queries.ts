import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { CAGE_NAME, currentMonthKey, monthBoundsUtc } from "@/lib/ledger";
import { getDb } from "./index";
import { gamePlayers, games, players, transfers } from "./schema";

export const BOARD_CACHE_TAG = "board";
export const ROSTER_CACHE_TAG = "roster";
export const LIVE_GAME_TAG = "live-game";
export const SETTLED_GAME_TAG = "settled-game";

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

type CachedSeat = Omit<GameSeat, "cashedOutAt"> & { cashedOutAt: string | null };

type CachedGame = Omit<GameDetail, "playedOn" | "players"> & {
  playedOn: string;
  players: CachedSeat[];
};

function freezeGame(game: GameDetail): CachedGame {
  return {
    ...game,
    playedOn: iso(game.playedOn),
    players: game.players.map((seat) => ({
      ...seat,
      cashedOutAt: seat.cashedOutAt ? iso(seat.cashedOutAt) : null,
    })),
  };
}

function reviveGame(game: CachedGame): GameDetail {
  return {
    ...game,
    playedOn: new Date(game.playedOn),
    players: game.players.map((seat) => ({
      ...seat,
      cashedOutAt: seat.cashedOutAt ? new Date(seat.cashedOutAt) : null,
    })),
  };
}

export type GameSeat = {
  playerId: string;
  name: string;
  buyIns: number;
  finalStack: number | null;
  moneyDiff: number | null;
  cashedOutAt: Date | null;
};

export type TransferSource = "early_cashout" | "settle";

export type GameTransfer = {
  id: string;
  fromId: string | null;
  fromName: string;
  toId: string | null;
  toName: string;
  toUpiId: string | null;
  amount: number;
  source: TransferSource;
};

export type GameDetail = {
  id: string;
  playedOn: Date;
  status: "live" | "settled";
  buyInCash: number;
  stackValue: number;
  sb: number | null;
  bb: number | null;
  players: GameSeat[];
  transfers: GameTransfer[];
};

export type RosterPlayer = {
  id: string;
  name: string;
  aliases: string[];
};

export const listRoster = unstable_cache(
  async (): Promise<RosterPlayer[]> => {
    const db = getDb();
    const rows = await db.select().from(players).orderBy(players.name);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      aliases: row.aliases ?? [],
    }));
  },
  ["roster"],
  { tags: [ROSTER_CACHE_TAG], revalidate: false },
);

export type PlayerUpiRow = {
  id: string;
  name: string;
  username: string | null;
  upiId: string | null;
};

export async function listPlayerUpis(): Promise<PlayerUpiRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      username: players.username,
      upiId: players.upiId,
    })
    .from(players)
    .orderBy(players.name);
  return rows;
}

const cachedLiveGame = unstable_cache(
  async (): Promise<CachedGame | null> => {
    const db = getDb();
    const [live] = await db
      .select()
      .from(games)
      .where(eq(games.status, "live"))
      .limit(1);
    if (!live) return null;
    const game = await assembleGame(live.id);
    return game ? freezeGame(game) : null;
  },
  ["live-game", "with-upi"],
  { tags: [LIVE_GAME_TAG], revalidate: false },
);

const cachedSettledGame = unstable_cache(
  async (id: string): Promise<CachedGame | null> => {
    const game = await assembleGame(id);
    if (!game || game.status !== "settled") return null;
    return freezeGame(game);
  },
  ["settled-game", "with-upi"],
  { tags: [SETTLED_GAME_TAG], revalidate: false },
);

export async function getLiveGame(): Promise<GameDetail | null> {
  const game = await cachedLiveGame();
  return game ? reviveGame(game) : null;
}

export async function getSettledGame(id: string): Promise<GameDetail | null> {
  const game = await cachedSettledGame(id);
  return game ? reviveGame(game) : null;
}

export async function getGame(id: string): Promise<GameDetail | null> {
  const live = await getLiveGame();
  if (live?.id === id) return live;
  return getSettledGame(id);
}

async function assembleGame(id: string): Promise<GameDetail | null> {
  const db = getDb();
  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  if (!game) return null;

  const seats = await db
    .select({
      playerId: gamePlayers.playerId,
      name: players.name,
      buyIns: gamePlayers.buyIns,
      finalStack: gamePlayers.finalStack,
      moneyDiff: gamePlayers.moneyDiff,
      cashedOutAt: gamePlayers.cashedOutAt,
      upiId: players.upiId,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(gamePlayers.gameId, id))
    .orderBy(players.name);

  const pays = await db
    .select()
    .from(transfers)
    .where(eq(transfers.gameId, id));

  const names = new Map(seats.map((seat) => [seat.playerId, seat.name]));
  const upis = new Map(seats.map((seat) => [seat.playerId, seat.upiId]));

  return {
    id: game.id,
    playedOn: game.playedOn,
    status: game.status,
    buyInCash: game.buyInCash,
    stackValue: game.stackValue,
    sb: game.sb,
    bb: game.bb,
    players: seats.map((seat) => ({
      playerId: seat.playerId,
      name: seat.name,
      buyIns: seat.buyIns,
      finalStack: seat.finalStack,
      moneyDiff: seat.moneyDiff,
      cashedOutAt: seat.cashedOutAt,
    })),
    transfers: pays.map((row) => ({
      id: row.id,
      fromId: row.fromPlayerId,
      fromName: row.fromPlayerId
        ? (names.get(row.fromPlayerId) ?? "Unknown")
        : CAGE_NAME,
      toId: row.toPlayerId,
      toName: row.toPlayerId
        ? (names.get(row.toPlayerId) ?? "Unknown")
        : CAGE_NAME,
      toUpiId: row.toPlayerId ? (upis.get(row.toPlayerId) ?? null) : null,
      amount: row.amount,
      source: row.source,
    })),
  };
}

export type SettledNight = {
  id: string;
  playedOn: Date;
  handle: number;
  playerCount: number;
};

const cachedSettledGames = unstable_cache(
  async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: games.id,
        playedOn: games.playedOn,
        handle: sql<number>`sum(${gamePlayers.buyIns}) * ${games.buyInCash}`,
        playerCount: sql<number>`count(${gamePlayers.id})`,
      })
      .from(games)
      .leftJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
      .where(eq(games.status, "settled"))
      .groupBy(games.id)
      .orderBy(desc(games.playedOn))
      .limit(3);

    return rows.map((row) => ({
      id: row.id,
      playedOn:
        row.playedOn instanceof Date
          ? row.playedOn.toISOString()
          : new Date(row.playedOn).toISOString(),
      handle: Number(row.handle ?? 0),
      playerCount: Number(row.playerCount ?? 0),
    }));
  },
  ["settled-games"],
  { tags: [BOARD_CACHE_TAG], revalidate: false },
);

export async function listSettledGames(): Promise<SettledNight[]> {
  const rows = await cachedSettledGames();
  return rows.map((row) => ({
    ...row,
    playedOn: new Date(row.playedOn),
  }));
}

export type LeaderboardRow = {
  playerId: string;
  name: string;
  net: number;
  games: number;
  wins: number;
  losses: number;
  even: number;
  biggestWin: number;
  biggestLoss: number;
};

export type PlayerNight = {
  gameId: string;
  playedOn: Date;
  moneyDiff: number;
  buyIns: number;
};

export const getLeaderboard = unstable_cache(
  async (monthKey: string): Promise<LeaderboardRow[]> => {
    const db = getDb();
    const { start, end } = monthBoundsUtc(monthKey);
    const rows = await db
      .select({
        playerId: players.id,
        name: players.name,
        net: sql<number>`coalesce(sum(${gamePlayers.moneyDiff}), 0)`,
        games: sql<number>`count(${gamePlayers.id})`,
        wins: sql<number>`sum(case when ${gamePlayers.moneyDiff} > 0 then 1 else 0 end)`,
        losses: sql<number>`sum(case when ${gamePlayers.moneyDiff} < 0 then 1 else 0 end)`,
        even: sql<number>`sum(case when ${gamePlayers.moneyDiff} = 0 then 1 else 0 end)`,
        biggestWin: sql<number>`coalesce(max(${gamePlayers.moneyDiff}), 0)`,
        biggestLoss: sql<number>`coalesce(min(${gamePlayers.moneyDiff}), 0)`,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .where(
        and(
          eq(games.status, "settled"),
          gte(games.playedOn, start),
          lt(games.playedOn, end),
        ),
      )
      .groupBy(players.id, players.name)
      .orderBy(sql`sum(${gamePlayers.moneyDiff}) desc`);

    return rows.map((row) => ({
      playerId: row.playerId,
      name: row.name,
      net: Number(row.net),
      games: Number(row.games),
      wins: Number(row.wins),
      losses: Number(row.losses),
      even: Number(row.even),
      biggestWin: Number(row.biggestWin),
      biggestLoss: Number(row.biggestLoss),
    }));
  },
  ["leaderboard"],
  { tags: [BOARD_CACHE_TAG], revalidate: false },
);

const cachedPlayerNights = unstable_cache(
  async (playerId: string, monthKey?: string) => {
    const db = getDb();
    const monthBounds = monthKey ? monthBoundsUtc(monthKey) : null;
    const rows = await db
      .select({
        gameId: games.id,
        playedOn: games.playedOn,
        moneyDiff: gamePlayers.moneyDiff,
        buyIns: gamePlayers.buyIns,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .where(
        and(
          eq(gamePlayers.playerId, playerId),
          eq(games.status, "settled"),
          monthBounds
            ? and(
                gte(games.playedOn, monthBounds.start),
                lt(games.playedOn, monthBounds.end),
              )
            : undefined,
        ),
      )
      .orderBy(desc(games.playedOn));

    return rows.map((row) => ({
      gameId: row.gameId,
      playedOn:
        row.playedOn instanceof Date
          ? row.playedOn.toISOString()
          : new Date(row.playedOn).toISOString(),
      moneyDiff: row.moneyDiff ?? 0,
      buyIns: row.buyIns,
    }));
  },
  ["player-nights"],
  { tags: [BOARD_CACHE_TAG], revalidate: false },
);

export async function getPlayerNights(
  playerId: string,
  monthKey?: string,
): Promise<PlayerNight[]> {
  const rows = await cachedPlayerNights(playerId, monthKey);
  return rows.map((row) => ({
    ...row,
    playedOn: new Date(row.playedOn),
  }));
}

export async function warmBoardCache(
  playerIds: string[],
  gameId?: string,
): Promise<void> {
  const monthKey = currentMonthKey();
  await Promise.all([
    getLeaderboard(monthKey),
    listSettledGames(),
    gameId ? getSettledGame(gameId) : Promise.resolve(null),
    ...playerIds.map((id) => getPlayerNights(id, monthKey)),
  ]);
}

export async function getPlayerName(playerId: string): Promise<string | null> {
  const roster = await listRoster();
  return roster.find((person) => person.id === playerId)?.name ?? null;
}
