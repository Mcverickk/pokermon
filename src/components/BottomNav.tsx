"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Table", icon: TableIcon },
  { href: "/history", label: "History", icon: CardIcon },
  { href: "/board", label: "Board", icon: StackIcon },
] as const;

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <ul className="glass mx-auto grid max-w-md grid-cols-3 rounded-full p-1.5">
        {items.map((item) => {
          const on =
            item.href === "/"
              ? path === "/" || path.startsWith("/game") || path === "/new"
              : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium tracking-wide ${
                  on ? "bg-ivory/15 text-ivory" : "text-mute"
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
