"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createGame } from "@/app/actions";
import { PinPad } from "./PinPad";

type Roster = { id: string; name: string }[];

export function CreateGameForm({ roster }: { roster: Roster }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState<{ name: string; buyIns: number }[]>([]);
  const [draft, setDraft] = useState("");
  const [buyInCash, setBuyInCash] = useState(500);
  const [stackValue, setStackValue] = useState(5000);
  const [pin, setPin] = useState<string | null>(null);
  const [pad, setPad] = useState<"set" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const seats = useMemo(() => {
    const fromRoster = roster
      .filter((p) => selected[p.id])
      .map((p) => ({ name: p.name, buyIns: selected[p.id] }));
    return [...fromRoster, ...extra.filter((e) => e.name.trim())];
  }, [roster, selected, extra]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = { ...cur };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function startNight() {
    setError(null);
    if (seats.length < 2) {
      setError("Pick at least two players.");
      return;
    }
    setPad("set");
  }

  function onPin(value: string) {
    if (pad === "set") {
      setPin(value);
      setPad("confirm");
      return;
    }
    if (pad === "confirm" && pin) {
      start(async () => {
        const result = await createGame({
          pin,
          pinConfirm: value,
          buyInCash,
          stackValue,
          seats,
        });
        if (!result.ok) {
          setError(result.error);
          setPad(null);
          setPin(null);
          return;
        }
        router.push(`/game/${result.gameId}`);
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
          New night
        </p>
        <h1 className="font-display text-4xl tracking-tight text-ivory">
          Deal the table
        </h1>
        <p className="mt-2 text-sm text-mute">
          Pick who sits, set the buy-in, then lock edits with a four-digit PIN.
        </p>
      </header>

      <section>
        <p className="text-xs font-medium text-mute">Regulars</p>
        <ul className="mt-3 flex flex-col gap-2">
          {roster.map((person) => {
            const on = Boolean(selected[person.id]);
            return (
              <li
                key={person.id}
                className={`glass flex items-center justify-between rounded-2xl px-3 py-2.5 ${
                  on ? "ring-1 ring-gold/50" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(person.id)}
                  className="flex-1 text-left font-display text-lg tracking-tight"
                >
                  {person.name}
                </button>
                {on ? (
                  <Stepper
                    value={selected[person.id]}
                    onChange={(n) =>
                      setSelected((cur) => ({ ...cur, [person.id]: n }))
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className="text-xs font-medium text-mute">Add a name</p>
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Who sat down?"
            className="min-w-0 flex-1 rounded-2xl bg-ivory/8 px-4 py-3 text-ivory placeholder:text-mute"
          />
          <button
            type="button"
            onClick={() => {
              const name = draft.trim();
              if (!name) return;
              setExtra((cur) => [...cur, { name, buyIns: 1 }]);
              setDraft("");
            }}
            className="btn-ghost px-4 text-sm font-medium"
          >
            Add
          </button>
        </div>
        {extra.map((person, i) => (
          <div
            key={`${person.name}-${i}`}
            className="glass mt-2 flex items-center justify-between rounded-2xl px-3 py-2.5 ring-1 ring-gold/40"
          >
            <span className="font-display text-lg">{person.name}</span>
            <Stepper
              value={person.buyIns}
              onChange={(n) =>
                setExtra((cur) =>
                  cur.map((row, idx) =>
                    idx === i ? { ...row, buyIns: n } : row,
                  ),
                )
              }
            />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <label className="glass rounded-2xl p-4">
          <span className="text-xs text-mute">Buy-in ₹</span>
          <input
            type="number"
            min={1}
            value={buyInCash}
            onChange={(e) => setBuyInCash(Number(e.target.value))}
            className="mt-1 w-full bg-transparent font-display text-2xl tabular text-ivory outline-none"
          />
        </label>
        <label className="glass rounded-2xl p-4">
          <span className="text-xs text-mute">Chip stack</span>
          <input
            type="number"
            min={1}
            value={stackValue}
            onChange={(e) => setStackValue(Number(e.target.value))}
            className="mt-1 w-full bg-transparent font-display text-2xl tabular text-ivory outline-none"
          />
        </label>
      </section>

      {error ? <p className="text-sm text-clay">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={startNight}
        className="btn-primary h-14 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Opening…" : "Start · set PIN"}
      </button>
      <p className="text-center text-xs text-mute">
        Don’t lose this PIN — it cannot be reset.
      </p>

      {pad ? (
        <PinPad
          title={pad === "set" ? "Set a PIN" : "Again, to lock it"}
          hint="Four digits. Anyone with the site can watch; only this PIN can edit."
          busy={pending}
          onSubmit={onPin}
          onCancel={() => {
            setPad(null);
            setPin(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="btn-ghost h-9 w-9"
      >
        −
      </button>
      <span className="w-6 text-center font-display text-xl tabular">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="btn-ghost h-9 w-9"
      >
        +
      </button>
    </div>
  );
}
