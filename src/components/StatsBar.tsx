"use client";

import { useStats } from "@/lib/hooks";

function Stat({ value, label, emoji, color }: { value: number; label: string; emoji: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-2 sm:px-3">
      <span className={`font-mono text-sm font-bold tabular-nums sm:text-base ${color}`}>
        <span className="mr-0.5 sm:hidden">{emoji}</span>
        {value.toLocaleString()}
      </span>
      <span className="hidden text-[12px] uppercase tracking-wide text-white/45 sm:block">
        {emoji} {label}
      </span>
    </div>
  );
}

export function StatsBar({ online }: { online: number }) {
  const { data } = useStats();
  const s = data ?? { kills: 0, resurrections: 0, active: 0 };
  return (
    <div className="glass pointer-events-auto flex items-center divide-x divide-white/10 rounded-full px-1 py-1.5 sm:px-1.5">
      <Stat value={online} label="online" emoji="👀" color="text-emerald-400" />
      <Stat value={s.kills} label="kills" emoji="☠" color="text-coral" />
      <Stat value={s.active} label="down" emoji="⏳" color="text-ember" />
      <Stat value={s.resurrections} label="revived" emoji="✨" color="text-gold" />
    </div>
  );
}
