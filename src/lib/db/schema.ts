import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("players_name_unique").on(table.name)],
);

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  playedOn: timestamp("played_on", { withTimezone: true })
    .defaultNow()
    .notNull(),
  status: text("status").$type<"live" | "settled">().notNull().default("live"),
  pinHash: text("pin_hash").notNull(),
  pinFailCount: integer("pin_fail_count").notNull().default(0),
  pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
  buyInCash: integer("buy_in_cash").notNull(),
  stackValue: integer("stack_value").notNull(),
  sb: integer("sb"),
  bb: integer("bb"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    buyIns: integer("buy_ins").notNull().default(1),
    finalStack: integer("final_stack"),
    moneyDiff: integer("money_diff"),
  },
  (table) => [
    uniqueIndex("game_players_game_player").on(table.gameId, table.playerId),
  ],
);

export const transfers = pgTable("transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  fromPlayerId: uuid("from_player_id")
    .notNull()
    .references(() => players.id),
  toPlayerId: uuid("to_player_id")
    .notNull()
    .references(() => players.id),
  amount: integer("amount").notNull(),
});
