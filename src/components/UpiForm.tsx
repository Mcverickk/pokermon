"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { logout, saveUpi } from "@/app/actions";
import { usePendingTransition } from "./PendingProvider";

export function UpiForm({ initialUpi }: { initialUpi: string }) {
  const router = useRouter();
  const [upi, setUpi] = useState(initialUpi);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = usePendingTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveUpi(upi);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="glass rounded-2xl px-4 py-3">
        <span className="text-xs font-medium tracking-[0.18em] text-mute uppercase">
          UPI ID
        </span>
        <input
          name="upi"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          value={upi}
          onChange={(e) => {
            setUpi(e.target.value);
            setSaved(false);
          }}
          placeholder="name@okicici"
          className="mt-1 w-full bg-transparent font-display text-2xl tracking-tight text-ivory outline-none placeholder:text-mute"
        />
      </label>
      <p className="text-sm text-mute">
        Saved once, used whenever someone on the receipt needs to pay you.
      </p>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      {saved ? <p className="text-sm text-gold">UPI saved.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary h-14 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Saving…" : initialUpi ? "Update UPI" : "Save UPI"}
      </button>
    </form>
  );
}

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
