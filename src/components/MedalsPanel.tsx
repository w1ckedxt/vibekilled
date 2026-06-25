"use client";

import { useState } from "react";
import { useMe } from "@/lib/hooks";
import { ACHIEVEMENTS, earnedAchievements, type Achievement, type Metric } from "@/lib/achievements";

const METRIC_LABEL: Record<Metric, string> = {
  kills: "kills",
  good4u: "Good4U received",
  sympathy: "sympathy received",
  score: "vibe score",
  gaveGood4u: "Good4U given",
  gaveSympathy: "sympathy given",
  gaveHandshake: "handshakes given",
  comments: "messages posted",
  downMinutes: "minutes down",
  streak: "day streak",
};

interface Tip {
  a: Achievement;
  got: boolean;
  have: number;
  x: number;
  y: number;
}

export function MedalsPanel({ userId }: { userId: string | null }) {
  const { data: me } = useMe(userId);
  const [tip, setTip] = useState<Tip | null>(null);

  const snap: Record<Metric, number> = {
    kills: me?.kills ?? 0,
    good4u: me?.good4u ?? 0,
    sympathy: me?.sympathy ?? 0,
    score: me?.score ?? 0,
    gaveGood4u: me?.gaveGood4u ?? 0,
    gaveSympathy: me?.gaveSympathy ?? 0,
    gaveHandshake: me?.gaveHandshake ?? 0,
    comments: me?.comments ?? 0,
    downMinutes: me?.downMinutes ?? 0,
    streak: me?.streak ?? 0,
  };
  const earned = new Set(earnedAchievements(snap).map((a) => a.id));

  function show(a: Achievement, e: React.MouseEvent) {
    setTip({ a, got: earned.has(a.id), have: snap[a.metric], x: e.clientX, y: e.clientY });
  }

  function sharePosition() {
    const url = typeof window !== "undefined" ? window.location.origin : "https://vibekilled.rip";
    const pos = me?.rank ? `#${me.rank}` : "on the board";
    const text = `I'm ${pos} on VibeKilled.rip with ${earned.size} medals 🏅 — ${snap.good4u} Good4U · ${snap.sympathy} sympathy. The Dev Down Detector. Come suffer with us:`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "VibeKilled.rip", text, url }).catch(() => {});
      return;
    }
    if (typeof window !== "undefined") {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="glass pointer-events-auto flex max-h-[60vh] flex-col rounded-2xl sm:max-h-[64vh]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="text-base leading-none">🏅</span>
        <span className="text-sm font-bold uppercase tracking-wide text-white/75">Your Medals</span>
        <span className="ml-auto text-xs text-white/40">
          {earned.size}/{ACHIEVEMENTS.length}
        </span>
      </div>

      {/* Personal all-time totals */}
      <div className="grid grid-cols-4 gap-2 px-3 py-3 text-center">
        <Total value={snap.kills} label="kills" color="text-coral" />
        <Total value={snap.good4u} label="Good4U" color="text-gold" />
        <Total value={snap.sympathy} label="symp." color="text-emerald-400" />
        <Total value={me?.rank ?? "—"} label="rank" color="text-electric" prefix={me?.rank ? "#" : ""} />
      </div>

      <button
        onClick={sharePosition}
        className="mx-3 mb-1 rounded-xl bg-electric/15 py-2.5 text-[13px] font-bold text-electric transition hover:bg-electric/25"
      >
        📣 Share my position
      </button>
      <p className="mb-2 px-3 text-center text-[11px] text-white/35">flaunt your rank &amp; medals on X</p>

      <div className="vk-scroll grid flex-1 grid-cols-2 gap-2 overflow-y-auto px-3 pb-3">
        {ACHIEVEMENTS.map((a) => {
          const got = earned.has(a.id);
          return (
            <button
              key={a.id}
              onMouseMove={(e) => show(a, e)}
              onMouseLeave={() => setTip(null)}
              onClick={(e) => show(a, e)}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                got ? "border-ember/40 bg-ember/10 hover:bg-ember/15" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <span className={`text-xl leading-none ${got ? "" : "opacity-40 grayscale"}`}>{got ? a.emoji : "🔒"}</span>
              <span className="min-w-0">
                <span className={`block truncate text-xs font-bold ${got ? "text-ember" : "text-white/55"}`}>{a.title}</span>
                <span className="block truncate text-[11px] text-white/35">{got ? "unlocked" : `${snap[a.metric]}/${a.threshold}`}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Cursor bubble */}
      {tip && (
        <div
          className="pointer-events-none fixed z-[900] w-56 -translate-y-full rounded-xl border border-white/15 bg-black/90 p-3 shadow-2xl backdrop-blur"
          style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 9999) - 240), top: tip.y - 10 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{tip.got ? tip.a.emoji : "🔒"}</span>
            <span className="text-sm font-bold text-white">{tip.a.title}</span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-white/65">{tip.a.blurb}</p>
          <p className="mt-1.5 text-[11px] font-semibold text-electric">
            {tip.got ? "✓ unlocked" : `${tip.have} / ${tip.a.threshold} ${METRIC_LABEL[tip.a.metric]}`}
          </p>
        </div>
      )}
    </div>
  );
}

function Total({ value, label, color, prefix = "" }: { value: number | string; label: string; color: string; prefix?: string }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className={`font-mono text-lg font-bold ${color}`}>
        {prefix}
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-white/45">{label}</div>
    </div>
  );
}
