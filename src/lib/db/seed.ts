import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { hashPassword } from "../password";
import { getDb } from "./index";
import { players } from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

const ROSTER: { name: string; aliases: string[]; username: string }[] = [
  { name: "Murli", aliases: [], username: "murli" },
  { name: "Chirag", aliases: [], username: "chirag" },
  { name: "Ankush", aliases: [], username: "ankush" },
  { name: "Rohit Yadav", aliases: ["Rohit"], username: "rohit" },
  { name: "Buddha", aliases: [], username: "buddha" },
  { name: "Aakarshit", aliases: ["Akarshit"], username: "aakarshit" },
  { name: "Jai", aliases: [], username: "jai" },
  { name: "Chinmay", aliases: [], username: "chinmay" },
];

function slugFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "player";
}

async function seed() {
  const db = getDb();

  for (const person of ROSTER) {
    const passwordHash = await hashPassword(person.name);
    await db
      .insert(players)
      .values({
        name: person.name,
        aliases: person.aliases,
        username: person.username,
        passwordHash,
      })
      .onConflictDoNothing({ target: players.name });

    await db
      .update(players)
      .set({ username: person.username, passwordHash })
      .where(eq(players.name, person.name));
  }

  const all = await db.select().from(players);
  const used = new Set(
    all
      .map((person) => person.username)
      .filter((username): username is string => Boolean(username)),
  );

  const created: { name: string; username: string }[] = [];
  for (const person of all) {
    if (person.username && person.passwordHash) continue;

    let username = person.username;
    if (!username) {
      const base = slugFromName(person.name);
      username = base;
      let n = 2;
      while (used.has(username)) {
        username = `${base}${n}`;
        n += 1;
      }
      used.add(username);
    }

    const passwordHash = await hashPassword(person.name);
    await db
      .update(players)
      .set({ username, passwordHash })
      .where(eq(players.id, person.id));
    created.push({ name: person.name, username });
  }

  console.log(`Seeded ${ROSTER.length} regulars. Password for each is their name.`);
  for (const person of ROSTER) {
    console.log(`  ${person.username}  ${person.name}`);
  }
  if (created.length) {
    console.log(
      `Set credentials on ${created.length} other players. Password is their name.`,
    );
    for (const person of created) {
      console.log(`  ${person.username}  ${person.name}`);
    }
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
