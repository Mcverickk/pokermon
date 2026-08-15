import { isUnlocked } from "@/app/actions";
import { LiveTable } from "@/components/LiveTable";
import { getGame, listRoster } from "@/lib/db/queries";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();
  if (game.status === "settled") redirect(`/game/${id}/settle`);

  const [unlocked, roster] = await Promise.all([
    isUnlocked(game.id),
    listRoster(),
  ]);

  return <LiveTable game={game} unlocked={unlocked} roster={roster} />;
}
