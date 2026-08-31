import { eq, ne } from "drizzle-orm";
import { config } from "dotenv";
import { ADMIN_NAME, ADMIN_USERNAME } from "../admin";
import { hashPassword } from "../password";
import { getDb } from "./index";
import { players } from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

const ROSTER: { name: string; aliases: string[] }[] = [
  { name: "Murli", aliases: [] },
  { name: "Chirag", aliases: [] },
  { name: "Ankush", aliases: [] },
  { name: "Rohit Yadav", aliases: ["Rohit"] },
  { name: "Buddha", aliases: [] },
  { name: "Aakarshit", aliases: ["Akarshit"] },
  { name: "Jai", aliases: [] },
  { name: "Chinmay", aliases: [] },
];

async function seed() {
  const db = getDb();

  for (const person of ROSTER) {
    await db
      .insert(players)
      .values({ name: person.name, aliases: person.aliases })
      .onConflictDoNothing({ target: players.name });
  }

  const passwordHash = await hashPassword(ADMIN_NAME);
  await db
    .update(players)
    .set({ username: ADMIN_USERNAME, passwordHash })
    .where(eq(players.name, ADMIN_NAME));

  await db
    .update(players)
    .set({ username: null, passwordHash: null })
    .where(ne(players.name, ADMIN_NAME));

  console.log(`Seeded regulars. House login: ${ADMIN_USERNAME} / ${ADMIN_NAME}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
