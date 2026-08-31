"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AccountLink({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  const path = usePathname();
  if (path === "/login") return null;
  const on = path === "/me";
  return (
    <Link
      href={href}
      className={`text-sm font-medium tracking-wide ${
        on ? "text-ivory" : "text-gold"
      }`}
    >
      {label}
    </Link>
  );
}

export function MobileAccountBar({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
      <AccountLink label={label} href={href} />
    </div>
  );
}
