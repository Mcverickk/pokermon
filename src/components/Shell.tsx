import { MobileAccountBar } from "./AccountLink";
import { BottomNav } from "./BottomNav";
import { PendingProvider } from "./PendingProvider";
import { firstName, getLoggedInPlayer } from "@/lib/auth";

export async function Shell({ children }: { children: React.ReactNode }) {
  const player = await getLoggedInPlayer();
  const account = player
    ? { label: firstName(player.name), href: "/me" as const }
    : { label: "Log in", href: "/login" as const };

  return (
    <PendingProvider>
      <div className="table-felt min-h-dvh w-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:max-w-6xl lg:px-8">
          <MobileAccountBar label={account.label} href={account.href} />
          <BottomNav account={account} />
          <main className="flex flex-1 flex-col px-4 pb-28 pt-4 lg:px-0 lg:pb-10 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </PendingProvider>
  );
}
