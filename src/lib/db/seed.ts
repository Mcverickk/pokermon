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

  console.log(
    `Seeded ${ROSTER.length} regulars. Password for each is their name.`,
  );
  console.log(
    `Usernames: ${ROSTER.map((person) => person.username).join(", ")}`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
