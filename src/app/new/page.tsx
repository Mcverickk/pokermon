import { CreateGameForm } from "@/components/CreateGameForm";
import { isDbConfigured } from "@/lib/db";
import { getLiveGame, listRoster } from "@/lib/db/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  if (!isDbConfigured()) redirect("/");
  const live = await getLiveGame();
  if (live) redirect(`/game/${live.id}`);
  const roster = await listRoster();
  return <CreateGameForm roster={roster} />;
}
