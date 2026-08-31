import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getLoggedInPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const player = await getLoggedInPlayer();
  if (player) redirect("/me");

  return (
    <div className="flex flex-col gap-6 lg:mx-auto lg:max-w-md">
      <header>
        <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
          House seat
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          Name they know you by
        </h1>
        <p className="mt-2 text-sm text-mute">
          Optional. Log in to save a UPI ID and pay from a receipt on this phone.
        </p>
      </header>
      <LoginForm />
    </div>
  );
}
