"use client";

import { useLeaderboard } from "@/lib/hooks";

const MEDAL = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { data: rows } = useLeaderboard();

  return (
    <div className="glass pointer-events-auto flex max-h-[40vh] flex-col rounded-2xl sm:max-h-[52vh]">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="text-sm leading-none">👑</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Vibe Kings</span>
        <span className="ml-auto text-[11px] uppercase tracking-wide text-white/30">most love</span>
      </div>

      <div className="vk-scroll flex-1 space-y-1 overflow-y-auto px-2.5 py-2.5">
        {!rows?.length && (
          <div className="py-4 text-center text-xs text-white/30">No royalty yet. Be the first to suffer publicly.</div>
        )}
        {rows?.map((r) => (
          <div
            key={r.rank}
            className={`vk-fadeup flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
              r.rank === 1 ? "border border-gold/30 bg-gold/[0.06]" : "bg-white/[0.03]"
            }`}
          >
            <span className="w-6 shrink-0 text-center text-sm font-bold">
              {r.rank <= 3 ? MEDAL[r.rank - 1] : <span className="text-white/40">{r.rank}</span>}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-xs font-semibold ${r.rank === 1 ? "text-gold" : "text-white/85"}`}>
                {r.name}
                {r.rank === 1 && <span className="ml-1 text-[12px] font-normal text-gold/70">· the king</span>}
              </div>
              <div className="text-[12px] text-white/40">
                💛 {r.good4u} · 🫂 {r.sympathy}
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-electric">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
