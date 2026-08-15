"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefreshButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [spin, setSpin] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setSpin(true);
        start(() => {
          router.refresh();
          setTimeout(() => setSpin(false), 400);
        });
      }}
      className={`btn-ghost px-3 py-1.5 text-xs font-medium ${className}`}
    >
      {pending || spin ? "Refreshing" : "Refresh"}
    </button>
  );
}
