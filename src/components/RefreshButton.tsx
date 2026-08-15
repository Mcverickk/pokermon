"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshBoardCache, refreshLiveCache } from "@/app/actions";

export function RefreshButton({
  className = "",
  scope,
}: {
  className?: string;
  scope?: "board" | "live";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [spin, setSpin] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setSpin(true);
        start(async () => {
          if (scope === "board") await refreshBoardCache();
          else if (scope === "live") await refreshLiveCache();
          else router.refresh();
          setTimeout(() => setSpin(false), 400);
        });
      }}
      className={`btn-ghost px-3 py-1.5 text-xs font-medium ${className}`}
    >
      {pending || spin ? "Refreshing" : "Refresh"}
    </button>
  );
}
