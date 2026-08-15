import { Receipt } from "@/components/Receipt";
import { getGame } from "@/lib/db/queries";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();
  if (game.status !== "settled") redirect(`/game/${id}/cashout`);
  return <Receipt game={game} />;
}
