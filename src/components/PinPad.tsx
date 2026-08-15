"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

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

  useLayoutEffect(() => {
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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (busy) return;
      if (event.target === inputRef.current) return;
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        apply(digits + event.key);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        apply(digits.slice(0, -1));
        return;
      }
      if (event.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, digits, onCancel]);

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
            autoFocus
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
          Enter four digits on the keypad
        </p>

        {error ? (
          <p className="mt-3 text-center text-sm text-clay">{error}</p>
        ) : null}

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
