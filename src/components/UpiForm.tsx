"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/app/actions";
import { usePendingTransition } from "./PendingProvider";

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = usePendingTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logout();
          router.push("/");
          router.refresh();
        })
      }
      className="btn-ghost h-12 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Leaving…" : "Log out"}
    </button>
  );
}
