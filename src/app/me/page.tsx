import { redirect } from "next/navigation";
import { LogoutButton, UpiForm } from "@/components/UpiForm";
import { getLoggedInPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const player = await getLoggedInPlayer();
  if (!player) redirect("/login");

  return (
    <div className="flex flex-col gap-6 lg:mx-auto lg:max-w-md">
      <header>
        <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
          Your seat
        </p>
        <h1 className="font-display text-4xl tracking-tight">{player.name}</h1>
        <p className="mt-1 font-display text-lg text-mute">{player.username}</p>
      </header>
      <UpiForm initialUpi={player.upiId ?? ""} />
      <LogoutButton />
    </div>
  );
}
