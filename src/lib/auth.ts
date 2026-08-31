import { eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb, isDbConfigured } from "@/lib/db";
import { players } from "@/lib/db/schema";

const COOKIE = "pokermon_user";
const TTL_MS = 12 * 60 * 60 * 1000;
export const ADMIN_USERNAME = "chirag";

type Payload = { playerId: string; exp: number };

export type LoggedInPlayer = {
  id: string;
  name: string;
  username: string;
  upiId: string | null;
  isAdmin: boolean;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is not set");
  }
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function userCookieName(): string {
  return COOKIE;
}

export function mintUserSession(playerId: string): string {
  const payload: Payload = { playerId, exp: Date.now() + TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readUserSession(token: string | undefined): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Payload;
    if (payload.exp < Date.now() || !payload.playerId) return null;
    return payload;
  } catch {
    return null;
  }
}

export const userCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export async function getLoggedInPlayer(): Promise<LoggedInPlayer | null> {
  if (!isDbConfigured()) return null;
  const token = (await cookies()).get(userCookieName())?.value;
  const session = readUserSession(token);
  if (!session) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: players.id,
      name: players.name,
      username: players.username,
      upiId: players.upiId,
    })
    .from(players)
    .where(eq(players.id, session.playerId))
    .limit(1);
  if (!row?.username) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    upiId: row.upiId,
    isAdmin: row.username === ADMIN_USERNAME,
  };
}

export function isAdminPlayer(
  player: { username: string } | null,
): boolean {
  return player?.username === ADMIN_USERNAME;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
