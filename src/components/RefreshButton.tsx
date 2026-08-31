"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshBoardCache, refreshLiveCache } from "@/app/actions";
import { usePendingTransition } from "./PendingProvider";

export function RefreshButton({
  className = "",
  scope,
}: {
  className?: string;
  scope?: "board" | "live";
}) {
  const router = useRouter();
  const [pending, start] = usePendingTransition();
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
