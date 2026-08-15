"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const items = [
  { href: "/", label: "Table", icon: TableIcon },
  { href: "/history", label: "History", icon: CardIcon },
  { href: "/board", label: "Board", icon: StackIcon },
] as const;

function tabIndex(path: string) {
  if (path.startsWith("/history")) return 1;
  if (path.startsWith("/board")) return 2;
  return 0;
}

export function BottomNav() {
  const path = usePathname();
  const index = tabIndex(path);
  const previous = useRef(index);
  const [ready, setReady] = useState(false);
  const distance = Math.abs(index - previous.current);

  useLayoutEffect(() => {
    previous.current = index;
  }, [index]);

  useLayoutEffect(() => {
    setReady(true);
  }, []);

  const ms = 220 + distance * 110;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:static lg:inset-x-auto lg:bottom-auto lg:flex lg:items-center lg:justify-between lg:px-0 lg:pb-0 lg:pt-6">
      <Link
        href="/"
        className="hidden font-display text-2xl tracking-tight text-ivory lg:block"
      >
        Pokermon
      </Link>
      <ul className="glass relative mx-auto grid max-w-md grid-cols-3 rounded-full p-1.5 lg:mx-0 lg:w-[22rem] lg:max-w-none">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-ivory/15"
          style={{
            transform: `translate3d(${index * 100}%, 0, 0)`,
            transition: ready
              ? `transform ${ms}ms cubic-bezier(0.32, 0.72, 0, 1)`
              : "none",
          }}
        />
        {items.map((item, i) => {
          const on = i === index;
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative z-10">
              <Link
                href={item.href}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium tracking-wide transition-colors duration-200 lg:h-11 lg:flex-row lg:gap-1.5 lg:text-xs ${
                  on ? "text-ivory" : "text-mute"
                }`}
              >
                <Icon active={on} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TableIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="7" cy="10" r="4.2" fill={active ? "#C43B3B" : "currentColor"} opacity={active ? 1 : 0.5} />
      <circle cx="11.5" cy="8" r="3.6" fill={active ? "#D4B06A" : "currentColor"} opacity={active ? 1 : 0.35} />
    </svg>
  );
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="4" y="3" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" opacity={active ? 1 : 0.55} />
      <path d="M9 7.2l.7 1.9h2l-1.6 1.2.6 1.9L9 11.1 7.3 12.2l.6-1.9-1.6-1.2h2z" fill={active ? "#C43B3B" : "currentColor"} />
    </svg>
  );
}

function StackIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="12" r="3.2" fill={active ? "#C43B3B" : "currentColor"} opacity={0.9} />
      <circle cx="9" cy="9.2" r="3.2" fill={active ? "#2f5640" : "currentColor"} opacity={0.7} />
      <circle cx="9" cy="6.5" r="3.2" fill={active ? "#D4B06A" : "currentColor"} opacity={0.85} />
    </svg>
  );
}
