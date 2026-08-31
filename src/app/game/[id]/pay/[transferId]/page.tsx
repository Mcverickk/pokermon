import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayChooser } from "@/components/PayChooser";
import { getGame } from "@/lib/db/queries";
import { formatNight, inr } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string; transferId: string }>;
}) {
  const { id, transferId } = await params;
  const game = await getGame(id);
  if (!game) notFound();
  if (game.status !== "settled") redirect(`/game/${id}/cashout`);

  const transfer = game.transfers.find((row) => row.id === transferId);
  if (!transfer?.toUpiId || transfer.amount <= 0) notFound();

  const night = formatNight(game.playedOn);
  const input = {
    pa: transfer.toUpiId,
    pn: transfer.toName,
    am: transfer.amount,
    tn: `Pokermon ${night}`,
  };

  return (
    <div className="flex flex-col gap-6 lg:mx-auto lg:max-w-md">
      <header>
        <Link href={`/game/${id}/settle`} className="text-sm text-gold">
          ← Receipt
        </Link>
        <p className="mt-4 text-xs font-medium tracking-[0.18em] text-gold uppercase">
          Send
        </p>
        <h1 className="font-display text-4xl tracking-tight">Pick an app</h1>
      </header>
      <PayChooser
        input={input}
        payee={transfer.toName}
        amountLabel={inr(transfer.amount)}
        vpa={transfer.toUpiId}
      />
    </div>
  );
}
