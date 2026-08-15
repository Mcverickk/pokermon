import { config } from "dotenv";
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
  console.log(`Seeded ${ROSTER.length} regulars.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
