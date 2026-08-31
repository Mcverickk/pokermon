"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { savePlayerUpis } from "@/app/actions";
import type { PlayerUpiRow } from "@/lib/db/queries";
import { usePendingTransition } from "./PendingProvider";

export function AdminUpiBook({ players }: { players: PlayerUpiRow[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((person) => [person.id, person.upiId ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = usePendingTransition();

  const blank = useMemo(
    () => players.filter((person) => !values[person.id]?.trim()).length,
    [players, values],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await savePlayerUpis(
        players.map((person) => ({
          playerId: person.id,
          upiId: values[person.id] ?? "",
        })),
      );
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
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
          House book
        </p>
        <p className="mt-1 text-sm text-mute">
          Write a VPA for each seat so Pay opens the right person.
          {blank ? ` ${blank} still blank.` : " All filled."}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {players.map((person) => (
          <li key={person.id} className="glass rounded-2xl px-4 py-3">
            <label className="block">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-lg tracking-tight">
                  {person.name}
                </span>
                {values[person.id]?.trim() ? (
                  <span className="text-[10px] font-medium tracking-[0.18em] text-gold uppercase">
                    set
                  </span>
                ) : (
                  <span className="text-[10px] font-medium tracking-[0.18em] text-mute uppercase">
                    blank
                  </span>
                )}
              </span>
              <input
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                value={values[person.id] ?? ""}
                onChange={(e) => {
                  setValues((cur) => ({ ...cur, [person.id]: e.target.value }));
                  setSaved(false);
                }}
                placeholder="name@okicici"
                className="mt-1 w-full bg-transparent font-display text-xl tracking-tight text-ivory outline-none placeholder:text-mute"
              />
            </label>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      {saved ? <p className="text-sm text-gold">Book written.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary h-14 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Writing…" : "Write VPAs"}
      </button>
    </form>
  );
}
