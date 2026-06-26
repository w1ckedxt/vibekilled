"use client";

import { useStats, useNow } from "@/lib/hooks";
import { wallStatus } from "@/lib/lore";

// A rotating, stats-driven "patch notes for the wall" line. Cycles every ~7s.
export function WallStatus({ className = "" }: { className?: string }) {
  const { data } = useStats();
  const now = useNow(7000);
  const tick = Math.floor(now / 7000);
  const line = wallStatus(data?.active ?? 0, data?.kills ?? 0, tick);

  return (
    <span key={tick} className={`vk-fadeup truncate ${className}`} title={line}>
      {line}
    </span>
  );
}
