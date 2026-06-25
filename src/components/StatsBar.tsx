"use client";

import { useStats } from "@/lib/hooks";

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-2.5">
      <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>{value.toLocaleString()}</span>
      <span className="text-[9px] uppercase tracking-wide text-white/40">{label}</span>
    </div>
  );
}

export function StatsBar() {
  const { data } = useStats();
  const s = data ?? { kills: 0, resurrections: 0, active: 0 };
  return (
    <div className="glass pointer-events-auto flex items-center divide-x divide-white/10 rounded-full px-1.5 py-1.5">
      <Stat value={s.kills} label="☠ kills" color="text-coral" />
      <Stat value={s.active} label="⏳ down" color="text-ember" />
      <Stat value={s.resurrections} label="✨ revived" color="text-gold" />
    </div>
  );
}
