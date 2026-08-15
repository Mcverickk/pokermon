import { isUnlocked } from "@/app/actions";
import { CashoutForm } from "@/components/CashoutForm";
import { getGame } from "@/lib/db/queries";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CashoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();
  if (game.status === "settled") redirect(`/game/${id}/settle`);
  const unlocked = await isUnlocked(game.id);
  return <CashoutForm game={game} unlocked={unlocked} />;
}
