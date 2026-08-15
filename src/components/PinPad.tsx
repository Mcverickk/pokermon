"use client";

import { useEffect, useRef, useState } from "react";

export function PinPad({
  title,
  hint,
  error,
  busy,
  onSubmit,
  onCancel,
}: {
  title: string;
  hint?: string;
  error?: string | null;
  busy?: boolean;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
}) {
  const [digits, setDigits] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [title, error, busy]);

  function apply(next: string) {
    if (busy) return;
    const pin = next.replace(/\D/g, "").slice(0, 4);
    setDigits(pin);
    if (pin.length === 4) {
      queueMicrotask(() => {
        onSubmit(pin);
        setDigits("");
        inputRef.current?.focus();
      });
    }
  }

  function press(value: string) {
    if (value === "del") {
      apply(digits.slice(0, -1));
      inputRef.current?.focus();
      return;
    }
    apply(digits + value);
    inputRef.current?.focus();
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-felt-deep/70 p-4 backdrop-blur-md sm:items-center">
      <div className="glass-strong w-full max-w-sm rounded-3xl p-5">
        <p className="font-display text-3xl tracking-tight text-ivory">{title}</p>
        {hint ? <p className="mt-1 text-sm text-mute">{hint}</p> : null}

        <label className="relative mt-5 block cursor-text">
          <span className="sr-only">Four-digit PIN</span>
          <div className="pointer-events-none flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`flex h-14 w-12 items-center justify-center rounded-2xl border font-display text-2xl text-gold ${
                  digits.length > i
                    ? "border-gold/70 bg-gold/15"
                    : "border-ivory/20 bg-ivory/5"
                }`}
              >
                {digits.length > i ? "•" : ""}
              </span>
            ))}
          </div>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={4}
            value={digits}
            disabled={busy}
            onChange={(e) => apply(e.target.value)}
            className="absolute inset-0 w-full cursor-text opacity-0"
            style={{ fontSize: 16 }}
            aria-label="Four-digit PIN"
          />
        </label>

        <p className="mt-3 text-center text-xs text-mute">
          Type four digits, or use the pad
        </p>

        {error ? (
          <p className="mt-3 text-center text-sm text-clay">{error}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
          {keys.map((key, i) =>
            key === "" ? (
              <span key={`pad-${i}`} />
            ) : (
              <button
                key={`pad-${i}`}
                type="button"
                disabled={busy}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => press(key)}
                className="h-14 rounded-2xl bg-ivory/8 font-display text-xl text-ivory active:bg-ivory/16 disabled:opacity-40"
              >
                {key === "del" ? "⌫" : key}
              </button>
            ),
          )}
        </div>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full py-2 text-sm text-mute"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
