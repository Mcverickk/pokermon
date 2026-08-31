"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/app/actions";
import { usePendingTransition } from "./PendingProvider";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = usePendingTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await login(username, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/me");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="glass rounded-2xl px-4 py-3">
        <span className="text-xs font-medium tracking-[0.18em] text-mute uppercase">
          Username
        </span>
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full bg-transparent font-display text-2xl tracking-tight text-ivory outline-none placeholder:text-mute"
          placeholder="chirag"
        />
      </label>
      <label className="glass rounded-2xl px-4 py-3">
        <span className="text-xs font-medium tracking-[0.18em] text-mute uppercase">
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full bg-transparent font-display text-2xl tracking-tight text-ivory outline-none"
        />
      </label>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary h-14 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Checking…" : "Take a seat"}
      </button>
    </form>
  );
}
