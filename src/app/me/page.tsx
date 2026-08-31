import { redirect } from "next/navigation";
import { AdminUpiBook } from "@/components/AdminUpiBook";
import { LogoutButton } from "@/components/UpiForm";
import { getLoggedInPlayer } from "@/lib/auth";
import { listPlayerUpis } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const player = await getLoggedInPlayer();
  if (!player) redirect("/login");

  const roster = await listPlayerUpis();

  return (
    <div className="flex flex-col gap-6 lg:mx-auto lg:max-w-2xl">
      <header>
        <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
          House seat
        </p>
        <h1 className="font-display text-4xl tracking-tight">{player.name}</h1>
        <p className="mt-1 font-display text-lg text-mute">{player.username}</p>
      </header>
      <AdminUpiBook
        key={roster.map((person) => `${person.id}:${person.upiId ?? ""}`).join("|")}
        players={roster}
      />
      <LogoutButton />
    </div>
  );
}
