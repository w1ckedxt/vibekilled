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
import { FireworkIcon } from "./FireworkIcon";
import { WallStatus } from "./WallStatus";
import { patchNoteFor, type PatchNote } from "@/lib/lore";

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

// The downed dev's name, always the visual hero of a line.
function Name({ children, tone = "text-white" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`font-extrabold ${tone}`}>{children}</span>;
}

const KILL_QUIPS = [
  (e: FeedEvent) => `Another one has to touch grass for ${dur(e.minutes)}. 🌱`,
  (e: FeedEvent) => `${dur(e.minutes)} of silence ahead. We've all been there. 🫶`,
  (e: FeedEvent) => `Got 429'd by ${provider(e.provider).label}. Hang in there.`,
  (e: FeedEvent) => `Send thoughts & coffee ☕ — ${dur(e.minutes)} to go.`,
  (e: FeedEvent) => `${dur(e.minutes)} in the penalty box. RIP the flow state.`,
  (e: FeedEvent) => `Dev Down #${e.seq} · grass-pilled for ${dur(e.minutes)}.`,
];

const REVIVE_LINES = [
  "clawed back to life",
  "is back online",
  "touched enough grass — we're so back",
  "rose from the dead",
];

// One presentation spec per event type: a colored accent, a leading icon, a short
// tag, and a headline that puts the NAME front and centre.
function view(ev: FeedEvent): {
  accent: string;
  ring: string;
  tag: string;
  tagTone: string;
  icon: React.ReactNode;
  headline: React.ReactNode;
} {
  const name = <Name>{ev.name}</Name>;
  switch (ev.type) {
    case "resurrection":
      return {
        accent: "border-l-gold/70 bg-gold/[0.06]",
        ring: "bg-gold/10",
        tag: "REVIVED",
        tagTone: "text-gold",
        icon: <FireworkIcon size={16} />,
        headline: <>{name} {REVIVE_LINES[hash(ev.id) % REVIVE_LINES.length]}</>,
      };
    case "good4u":
      return {
        accent: "border-l-gold/60 bg-gold/[0.04]",
        ring: "bg-gold/10",
        tag: "GOOD4U",
        tagTone: "text-gold",
        icon: <span className="text-[13px] leading-none">💛</span>,
        headline: <>cheered {name}&rsquo;s comeback</>,
      };
    case "sympathy":
      return {
        accent: "border-l-emerald-400/60 bg-emerald-400/[0.04]",
        ring: "bg-emerald-400/10",
        tag: "SYMPATHY",
        tagTone: "text-emerald-400",
        icon: <span className="text-[13px] leading-none">🫂</span>,
        headline: <>sent {name} some sympathy</>,
      };
    case "handshake":
      return {
        accent: "border-l-electric/60 bg-electric/[0.04]",
        ring: "bg-electric/10",
        tag: "I HEAR YOU",
        tagTone: "text-electric",
        icon: <span className="text-[13px] leading-none">🤝</span>,
        headline: <>told {name} they&rsquo;re not alone</>,
      };
    default:
      return {
        accent: "border-l-coral/70 bg-coral/[0.07]",
        ring: "bg-coral/15",
        tag: "DEV DOWN",
        tagTone: "text-coral",
        icon: <span className="text-[13px] leading-none">💀</span>,
        headline: <>{name} hit the wall</>,
      };
  }
}

function FeedCard({
  ev,
  now,
  myPinId,
  onFocus,
}: {
  ev: FeedEvent;
  now: number;
  myPinId: string | null;
  onFocus: (t: FocusTarget) => void;
}) {
  const p = provider(ev.provider);
  const v = view(ev);
  const targetFlag = flagEmoji(ev.country);
  const actorFlag = flagEmoji(ev.actorCountry);
  const isReaction = ev.type === "good4u" || ev.type === "sympathy" || ev.type === "handshake";
  const qc = useQueryClient();
  const { data: pins } = usePins();

  const pin = pins?.find((x) => x.id === ev.pinId);
  const canFocus = Boolean(pin);
  const mine = Boolean(ev.pinId) && ev.pinId === myPinId;

  // Only OTHER downed devs get the "I hear you" handshake — never your own card.
  const canShake = ev.type === "kill" && Boolean(ev.pinId) && !mine;
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

  return (
    <div
      onClick={focus}
      className={`vk-fadeup group rounded-lg border-l-[3px] ${v.accent} px-2.5 py-1.5 transition ${
        canFocus ? "cursor-pointer hover:brightness-125" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Leading event icon in a soft colored chip */}
        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${v.ring}`}>{v.icon}</span>

        <div className="min-w-0 flex-1">
          {/* Meta line: who→whom (flags) · TAG ............ time */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 leading-none">
              {isReaction && actorFlag && (
                <>
                  <span className="text-[22px] drop-shadow-md">{actorFlag}</span>
                  <span className="text-[14px] font-black text-gold">→</span>
                </>
              )}
              {targetFlag && <span className="text-[22px] drop-shadow-md">{targetFlag}</span>}
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.glow }} />
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${v.tagTone}`}>{v.tag}</span>
            {mine && (
              <span className="rounded-full bg-white/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white/70">
                you
              </span>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-white/30">{timeAgo(ev.at, now)}</span>
          </div>

          {/* Headline — the name is the hero */}
          <p className="mt-0.5 text-[13px] leading-snug text-white/75">{v.headline}</p>

          {/* Kill cards carry the empathetic quip + last words + handshake */}
          {ev.type === "kill" && (
            <>
              <p className="mt-0.5 text-[12px] leading-snug text-white/45">{KILL_QUIPS[hash(ev.id) % KILL_QUIPS.length](ev)}</p>
              {ev.message && (
                <p className="mt-1 border-l-2 border-white/10 pl-2 text-[11px] italic leading-snug text-white/55">
                  &ldquo;{ev.message}&rdquo;
                </p>
              )}
            </>
          )}

          {/* Action row */}
          <div className="mt-1 flex items-center gap-2">
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
            {canFocus && (
              <span className="ml-auto text-[11px] font-medium text-white/30 transition group-hover:text-white/55">
                visit on map →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Satirical changelog card, interleaved into the feed for flavour. Not a real
// event — no pin, no actions.
function PatchNoteCard({ note }: { note: PatchNote }) {
  return (
    <div className="vk-fadeup rounded-lg border border-dashed border-white/12 bg-white/[0.02] px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-[12px]">📟</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Patch notes</span>
        <span className="rounded bg-white/5 px-1.5 py-px font-mono text-[10px] text-white/45">{note.tag}</span>
      </div>
      <p className="mt-1 pl-[30px] text-[12px] leading-snug text-white/55">{note.line}</p>
    </div>
  );
}

export function LiveFeed({ myPinId, onFocus }: { myPinId: string | null; onFocus: (t: FocusTarget) => void }) {
  const { data: events } = useFeed();
  const now = useNow(5000);
  const slow = Math.floor(now / 20000); // slow rotation for patch notes

  // Real events with a satirical patch note slipped in every few rows.
  const evs = events?.slice(0, 50) ?? [];
  const rows: React.ReactNode[] = [];
  evs.forEach((ev, i) => {
    rows.push(<FeedCard key={ev.id} ev={ev} now={now} myPinId={myPinId} onFocus={onFocus} />);
    if ((i + 1) % 5 === 0 && i < evs.length - 1) {
      rows.push(<PatchNoteCard key={`pn-${i}`} note={patchNoteFor(Math.floor(i / 5), slow)} />);
    }
  });

  return (
    <div className="glass pointer-events-auto flex max-h-[34vh] flex-col rounded-2xl sm:max-h-[44vh]">
      <div className="border-b border-white/8 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] leading-none">🌍</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Globe of Pain</span>
          <span className="vk-caret ml-auto font-mono text-xs text-coral">▍</span>
        </div>
        {/* Satirical, live "wall status" ticker */}
        <div className="mt-1 flex items-center gap-1 text-[10px] text-white/35">
          <span>🩺</span>
          <WallStatus className="min-w-0 flex-1" />
        </div>
      </div>
      <div className="vk-scroll flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {!rows.length && <div className="py-4 text-center text-xs text-white/30">All quiet… for now.</div>}
        {rows}
      </div>
    </div>
  );
}
