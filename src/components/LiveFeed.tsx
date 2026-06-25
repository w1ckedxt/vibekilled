"use client";

import { useFeed, useNow } from "@/lib/hooks";
import { provider } from "@/lib/providers";
import { timeAgo } from "@/lib/time";
import type { FeedEvent } from "@/lib/types";

function dur(minutes?: number): string {
  if (!minutes) return "a while";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// Stable hash so each event keeps the same quip across re-renders/polls.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const KILL_QUIPS = [
  (e: FeedEvent) => `Dev Down #${e.seq}: ${e.name} has to touch grass for ${dur(e.minutes)} 🌱`,
  (e: FeedEvent) => `#${e.seq} down — ${e.name} got 429'd by ${provider(e.provider).label}. F.`,
  (e: FeedEvent) => `${e.name} hit the wall. Resurrection ETA: ${dur(e.minutes)}.`,
  (e: FeedEvent) => `Another one. #${e.seq} is rate-limited for ${dur(e.minutes)}.`,
  (e: FeedEvent) => `${e.name} (${provider(e.provider).label}) entered the waiting room — ${dur(e.minutes)} to go.`,
  (e: FeedEvent) => `RIP ${e.name}'s flow state. Back in ~${dur(e.minutes)}.`,
  (e: FeedEvent) => `${e.name} just discovered their quota. ${dur(e.minutes)} of reflection ahead.`,
  (e: FeedEvent) => `Dev Down #${e.seq}${e.place ? ` ${e.place}` : ""} — ${dur(e.minutes)} sentence.`,
];

const RESURRECT_QUIPS = [
  (e: FeedEvent) => `${e.name} rose from the dead ✨`,
  (e: FeedEvent) => `Resurrection complete: ${e.name} is back online 🔥`,
  (e: FeedEvent) => `${e.name} touched enough grass. We're so back.`,
];

function render(ev: FeedEvent): { text: string; accent: string; tag: string } {
  const seed = hash(ev.id);
  switch (ev.type) {
    case "kill":
      return { text: KILL_QUIPS[seed % KILL_QUIPS.length](ev), accent: "border-l-coral", tag: "DOWN" };
    case "resurrection":
      return { text: RESURRECT_QUIPS[seed % RESURRECT_QUIPS.length](ev), accent: "border-l-gold", tag: "REVIVED" };
    case "good4u":
      return { text: `Someone cheered ${ev.name}'s comeback 💛`, accent: "border-l-gold", tag: "LOVE" };
    case "sympathy":
      return { text: `${ev.name} just got some sympathy 🫂`, accent: "border-l-electric", tag: "💧" };
  }
}

export function LiveFeed() {
  const { data: events } = useFeed();
  const now = useNow(5000);

  return (
    <div className="glass pointer-events-auto flex max-h-[34vh] flex-col rounded-2xl sm:max-h-[42vh]">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Global live feed</span>
      </div>
      <div className="vk-scroll flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2.5">
        {!events?.length && <div className="py-4 text-center text-xs text-white/30">All quiet… for now.</div>}
        {events?.map((ev) => {
          const r = render(ev);
          const p = provider(ev.provider);
          return (
            <div
              key={ev.id}
              className={`vk-fadeup rounded-lg border-l-2 bg-white/[0.03] px-3 py-2 ${r.accent}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: p.glow, boxShadow: `0 0 6px ${p.glow}` }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">{p.label}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">· {r.tag}</span>
                </span>
                <span className="text-[10px] text-white/25">{timeAgo(ev.at, now)}</span>
              </div>
              <p className="mt-0.5 text-xs leading-snug text-white/80">{r.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
