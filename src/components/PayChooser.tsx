"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  UPI_APPS,
  detectPayPlatform,
  upiAppUrl,
  type UpiPayInput,
} from "@/lib/upi";

function subscribe() {
  return () => {};
}

function getPayPlatform() {
  return detectPayPlatform(navigator.userAgent);
}

function getServerPayPlatform() {
  return "android" as const;
}

export function PayChooser({
  input,
  payee,
  amountLabel,
  vpa,
}: {
  input: UpiPayInput;
  payee: string;
  amountLabel: string;
  vpa: string;
}) {
  const platform = useSyncExternalStore(
    subscribe,
    getPayPlatform,
    getServerPayPlatform,
  );
  const [copied, setCopied] = useState(false);

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-display text-5xl tracking-tight text-gold tabular">
          {amountLabel}
        </p>
        <p className="mt-1 text-lg text-ivory">{payee}</p>
        <p className="mt-0.5 font-display text-sm text-mute">{vpa}</p>
      </div>

      <p className="text-sm text-mute">
        Pick the app on this phone. If nothing opens, that app isn’t installed.
      </p>

      <ul className="flex flex-col gap-2">
        {UPI_APPS.map((app) => (
          <li key={app.id}>
            <a
              href={upiAppUrl(app, input, platform)}
              className="glass flex h-14 items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-ivory/6"
            >
              <span
                className="poker-chip h-8 w-8 shrink-0"
                style={{ "--chip-fill": app.color } as CSSProperties}
                aria-hidden
              />
              <span className="font-display text-xl tracking-tight">
                {app.label}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={copyVpa}
        className="btn-ghost h-12 text-sm font-medium"
      >
        {copied ? "VPA copied" : "Copy VPA instead"}
      </button>
    </div>
  );
}
