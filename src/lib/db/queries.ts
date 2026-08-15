import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { gamePlayers, games, players, transfers } from "./schema";

export type GameSeat = {
  playerId: string;
  name: string;
  buyIns: number;
  finalStack: number | null;
  moneyDiff: number | null;
};

export type GameTransfer = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
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

export async function listRoster(): Promise<RosterPlayer[]> {
  const db = getDb();
  const rows = await db.select().from(players).orderBy(players.name);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
  }));
}

export async function getLiveGame(): Promise<GameDetail | null> {
  const db = getDb();
  const [live] = await db
    .select()
    .from(games)
    .where(eq(games.status, "live"))
    .limit(1);
  if (!live) return null;
  return assembleGame(live.id);
}

export async function getGame(id: string): Promise<GameDetail | null> {
  return assembleGame(id);
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

  return {
    id: game.id,
    playedOn: game.playedOn,
    status: game.status,
    buyInCash: game.buyInCash,
    stackValue: game.stackValue,
    sb: game.sb,
    bb: game.bb,
    players: seats,
    transfers: pays.map((row) => ({
      fromId: row.fromPlayerId,
      fromName: names.get(row.fromPlayerId) ?? "Unknown",
      toId: row.toPlayerId,
      toName: names.get(row.toPlayerId) ?? "Unknown",
      amount: row.amount,
    })),
  };
}

export async function listSettledGames(): Promise<
  { id: string; playedOn: Date; handle: number; playerCount: number }[]
> {
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
    .orderBy(desc(games.playedOn));

  return rows.map((row) => ({
    id: row.id,
    playedOn: row.playedOn,
    handle: Number(row.handle ?? 0),
    playerCount: Number(row.playerCount ?? 0),
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

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const db = getDb();
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
    .where(eq(games.status, "settled"))
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
}

export async function getPlayerNights(playerId: string): Promise<
  { gameId: string; playedOn: Date; moneyDiff: number; buyIns: number }[]
> {
  const db = getDb();
  const rows = await db
    .select({
      gameId: games.id,
      playedOn: games.playedOn,
      moneyDiff: gamePlayers.moneyDiff,
      buyIns: gamePlayers.buyIns,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(and(eq(gamePlayers.playerId, playerId), eq(games.status, "settled")))
    .orderBy(desc(games.playedOn));

  return rows.map((row) => ({
    gameId: row.gameId,
    playedOn: row.playedOn,
    moneyDiff: row.moneyDiff ?? 0,
    buyIns: row.buyIns,
  }));
}

export async function getPlayerName(playerId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ name: players.name })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  return row?.name ?? null;
}
