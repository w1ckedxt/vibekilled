"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFeed, useNow, usePins } from "@/lib/hooks";
import { provider } from "@/lib/providers";
import { flagEmoji } from "@/lib/geo";
import { reactPin } from "@/lib/api";
import { hasReacted, markReacted } from "@/lib/identity";
import { timeAgo } from "@/lib/time";
import type { FeedEvent } from "@/lib/types";
import type { FocusTarget } from "./MapView";

function dur(minutes?: number): string {
  if (!minutes) return "a while";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Empathetic-but-playful — the "aww, another one has to touch grass" vibe.
const KILL_QUIPS = [
  (e: FeedEvent) => `Aww, another one 🪦 ${e.name} has to touch grass for ${dur(e.minutes)}.`,
  (e: FeedEvent) => `Poor ${e.name} just hit the wall. ${dur(e.minutes)} of silence ahead. 🫶`,
  (e: FeedEvent) => `${e.name} got 429'd by ${provider(e.provider).label}. We've all been there. (${dur(e.minutes)})`,
  (e: FeedEvent) => `Send thoughts & coffee ☕ — ${e.name} is down for ${dur(e.minutes)}.`,
  (e: FeedEvent) => `Oof. ${e.name} needs ${dur(e.minutes)} to recover. Hang in there, friend.`,
  (e: FeedEvent) => `Dev Down #${e.seq}: ${e.name} got grass-pilled for ${dur(e.minutes)} 🌱`,
  (e: FeedEvent) => `RIP ${e.name}'s flow state. ${dur(e.minutes)} in the penalty box.`,
  (e: FeedEvent) => `${e.name} entered the waiting room${e.place ? ` ${e.place}` : ""}. ${dur(e.minutes)} to go. 💔`,
];

const RESURRECT_QUIPS = [
  (e: FeedEvent) => `${e.name} rose from the dead 🎆`,
  (e: FeedEvent) => `Resurrection complete: ${e.name} is back online 🔥`,
  (e: FeedEvent) => `${e.name} touched enough grass. We're so back. 🌱✨`,
];

function reactionLine(ev: FeedEvent): { text: string; accent: string; tag: string } {
  switch (ev.type) {
    case "resurrection":
      return { text: RESURRECT_QUIPS[hash(ev.id) % RESURRECT_QUIPS.length](ev), accent: "border-l-gold", tag: "REVIVED" };
    case "good4u":
      return { text: `Someone cheered ${ev.name}'s comeback 💛`, accent: "border-l-gold", tag: "LOVE" };
    case "sympathy":
      return { text: `${ev.name} just got some sympathy 🫂`, accent: "border-l-emerald-400", tag: "💧" };
    case "handshake":
      return { text: `Someone told ${ev.name}: I hear you 🤝`, accent: "border-l-electric", tag: "RESPECT" };
    default:
      return { text: "", accent: "", tag: "" };
  }
}

function FeedCard({ ev, now, onFocus }: { ev: FeedEvent; now: number; onFocus: (t: FocusTarget) => void }) {
  const p = provider(ev.provider);
  const flag = flagEmoji(ev.country);
  const qc = useQueryClient();
  const { data: pins } = usePins();

  const pin = pins?.find((x) => x.id === ev.pinId);
  const canFocus = Boolean(pin);

  // Only the downed dev's card gets "I hear you".
  const canShake = ev.type === "kill" && Boolean(ev.pinId);
  const liveCount = pin?.handshake ?? 0;
  const [optimistic, setOptimistic] = useState(0);
  const shownCount = Math.max(liveCount, optimistic);
  const [shaken, setShaken] = useState(() => (ev.pinId ? hasReacted(ev.pinId, "handshake") : false));

  function focus() {
    if (pin) onFocus({ id: pin.id, lat: pin.lat, lng: pin.lng, n: now });
  }

  async function shake(e: React.MouseEvent) {
    e.stopPropagation();
    if (!ev.pinId || shaken) return;
    setShaken(true);
    setOptimistic(liveCount + 1);
    markReacted(ev.pinId, "handshake");
    try {
      await reactPin(ev.pinId, "handshake");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["pins"] });
    } catch {
      /* optimistic */
    }
  }

  // Kill cards get a distinct, louder, empathetic look.
  if (ev.type === "kill") {
    return (
      <div
        onClick={focus}
        className={`vk-fadeup rounded-xl border border-coral/25 bg-coral/[0.07] px-3 py-2.5 ${canFocus ? "cursor-pointer hover:border-coral/50" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            {flag && <span className="text-xs leading-none">{flag}</span>}
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.glow, boxShadow: `0 0 6px ${p.glow}` }} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-coral/80">💀 just dropped · {p.label}</span>
          </span>
          <span className="text-[12px] text-white/25">{timeAgo(ev.at, now)}</span>
        </div>

        <p className="mt-1 text-[13px] font-medium leading-snug text-white/90">{KILL_QUIPS[hash(ev.id) % KILL_QUIPS.length](ev)}</p>

        {ev.message && (
          <p className="mt-1 border-l-2 border-white/10 pl-2 text-[11px] italic leading-snug text-white/55">“{ev.message}”</p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          {canShake && (
            <button
              onClick={shake}
              disabled={shaken}
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold transition ${
                shaken ? "bg-electric/10 text-electric/60" : "bg-electric/15 text-electric hover:bg-electric/25"
              }`}
            >
              🤝 I hear you{shownCount > 0 ? ` · ${shownCount}` : ""}
            </button>
          )}
          {canFocus && <span className="ml-auto text-[12px] text-white/30">tap to visit on map →</span>}
        </div>
      </div>
    );
  }

  // Reaction/resurrection cards: subtler.
  const r = reactionLine(ev);
  return (
    <div
      onClick={focus}
      className={`vk-fadeup rounded-lg border-l-2 bg-white/[0.03] px-3 py-2 ${r.accent} ${canFocus ? "cursor-pointer hover:bg-white/[0.06]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          {flag && <span className="text-[11px] leading-none">{flag}</span>}
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.glow, boxShadow: `0 0 6px ${p.glow}` }} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">{p.label}</span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/25">· {r.tag}</span>
        </span>
        <span className="text-[12px] text-white/25">{timeAgo(ev.at, now)}</span>
      </div>
      <p className="mt-0.5 text-xs leading-snug text-white/80">{r.text}</p>
    </div>
  );
}

export function LiveFeed({ onFocus }: { onFocus: (t: FocusTarget) => void }) {
  const { data: events } = useFeed();
  const now = useNow(5000);

  return (
    <div className="glass pointer-events-auto flex max-h-[34vh] flex-col rounded-2xl sm:max-h-[44vh]">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="text-sm leading-none">🌍</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Globe of Pain</span>
        <span className="vk-caret ml-auto font-mono text-xs text-coral">▍</span>
      </div>
      <div className="vk-scroll flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2.5">
        {!events?.length && <div className="py-4 text-center text-xs text-white/30">All quiet… for now.</div>}
        {events?.slice(0, 50).map((ev) => (
          <FeedCard key={ev.id} ev={ev} now={now} onFocus={onFocus} />
        ))}
      </div>
    </div>
  );
}
