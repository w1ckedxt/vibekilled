"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Pin } from "@/lib/types";
import { provider } from "@/lib/providers";
import { flagEmoji } from "@/lib/geo";
import { reactPin } from "@/lib/api";
import { hasReacted, markReacted } from "@/lib/identity";
import { formatCountdown, timeAgo } from "@/lib/time";
import { useNow, useStats } from "@/lib/hooks";
import { CountUp } from "./CountUp";
import { Campfire } from "./Campfire";
import { FireworkIcon } from "./FireworkIcon";
import { diagnosis, eulogy } from "@/lib/lore";

// One popup, two very different lives: your OWN stone is a premium personal
// dashboard (MyStoneCard), while everyone else's is the compact condolence card
// (VisitorCard). Splitting them keeps each focused — no isMine spaghetti.
export function PinPopup({ pin, isMine }: { pin: Pin; isMine: boolean }) {
  return isMine ? <MyStoneCard pin={pin} /> : <VisitorCard pin={pin} />;
}

// ── YOUR stone — "wow, this is MY card" ─────────────────────────────────────────
// A glowing, provider-tinted hero that lands the instant you drop. Big name,
// dramatic clock-style countdown, the Campfire arcade, and who's waiting with you.
function MyStoneCard({ pin }: { pin: Pin }) {
  const meta = provider(pin.provider);
  const now = useNow();
  const { data: stats } = useStats();
  const waiting = stats?.active ?? 0;
  const flag = flagEmoji(pin.country);
  const remaining = pin.recoverAt - now;
  const resurrected = pin.resurrected || remaining <= 0;
  const glow = meta.glow;

  return (
    <div className="vk-mine-reveal relative w-[300px] font-sans text-[#e8e8ea]">
      {/* Ambient provider halo bleeding down from the top — this is what makes the
          card feel alive and personal instead of a flat grey box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 -top-4 h-28 blur-2xl"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${glow}55, transparent 72%)` }}
      />

      <div className="relative">
        {/* Identity row — your flag, your agent, and an unmissable glowing YOU */}
        <div className="flex items-center gap-1.5">
          {flag && <span className="text-lg leading-none">{flag}</span>}
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: glow, boxShadow: `0 0 10px ${glow}` }} />
          <span className="text-[15px] font-bold">{meta.label}</span>
          <span
            className="vk-you-pulse ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-black"
            style={{ background: glow, boxShadow: `0 0 16px ${glow}` }}
          >
            ★ You
          </span>
        </div>

        {/* Hero identity — your alias as the headline of your own tombstone */}
        <div className="mt-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">your stone</div>
          <div
            className="mt-0.5 text-[23px] font-black leading-tight tracking-tight"
            style={{ textShadow: `0 0 26px ${glow}66` }}
          >
            {pin.name}
          </div>
        </div>

        {/* Last words — or a generated eulogy — as a tinted pull-quote */}
        {pin.message ? (
          <div className="mt-2 border-l-2 pl-2.5 text-[13px] italic leading-snug text-white/85" style={{ borderColor: `${glow}99` }}>
            “{pin.message}”
          </div>
        ) : (
          <div className="mt-2 border-l-2 border-white/10 pl-2.5 text-[12px] italic leading-snug text-white/45">
            {eulogy(pin.name, pin.id)}
          </div>
        )}

        {/* The hero — a dramatic, glowing clock (or the resurrection payoff) */}
        {resurrected ? (
          <div
            className="relative mt-3 overflow-hidden rounded-2xl border border-gold/25 px-4 py-4 text-center"
            style={{ background: "linear-gradient(160deg, rgba(255,209,102,0.16), transparent 62%)" }}
          >
            <span className="flex items-center justify-center gap-2 text-lg font-black text-gold">
              <FireworkIcon size={20} /> You&apos;re back <FireworkIcon size={20} />
            </span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/55">
              resurrected {timeAgo(pin.recoverAt, now)}
            </span>
          </div>
        ) : (
          <div
            className="relative mt-3 overflow-hidden rounded-2xl border px-4 py-4 text-center"
            style={{ borderColor: `${glow}30`, background: `linear-gradient(160deg, ${glow}16, transparent 60%)` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">you resurrect in</div>
            <div className="mt-1.5">
              <HeroCountdown ms={remaining} />
            </div>
            <div className="mt-2 text-[11px] text-white/35">hang tight — the wall always falls 🧱</div>
          </div>
        )}

        {/* Your universe behind the wall: the arcade sits right up top so Tetris /
            LOLReads are the first thing you reach while the timer runs. */}
        {!resurrected && (
          <div className="mt-3">
            <Campfire myPinId={pin.id} myProvider={pin.provider} />
          </div>
        )}

        <WaitingBadge count={waiting} />
        <Tally good4u={pin.good4u} sympathy={pin.sympathy} handshake={pin.handshake} views={pin.views} />
      </div>
    </div>
  );
}

// A clock-style countdown that reads as a hero, not a line of text: each unit is
// a big glowing number with a small unit tag, ember-lit for that "time's ticking".
function HeroCountdown({ ms }: { ms: number }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: Array<[number, string]> = h > 0 ? [[h, "h"], [m, "m"], [s, "s"]] : [[m, "m"], [s, "s"]];
  return (
    <div className="flex items-baseline justify-center gap-2.5">
      {parts.map(([value, unit]) => (
        <div key={unit} className="flex items-baseline">
          <span
            className="font-mono text-[38px] font-black leading-none tabular-nums text-ember"
            style={{ textShadow: "0 0 28px rgba(255,159,28,0.5)" }}
          >
            {String(value).padStart(2, "0")}
          </span>
          <span className="ml-0.5 font-mono text-[15px] font-bold text-ember/55">{unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── Everyone else's stone — the compact condolence card ─────────────────────────
function VisitorCard({ pin }: { pin: Pin }) {
  const meta = provider(pin.provider);
  const now = useNow();
  const { data: stats } = useStats();
  const waiting = stats?.active ?? 0;
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState({ good4u: pin.good4u, sympathy: pin.sympathy });
  const remaining = pin.recoverAt - now;
  const resurrected = pin.resurrected || remaining <= 0;
  const flag = flagEmoji(pin.country);

  async function send(action: "good4u" | "sympathy") {
    if (busy || hasReacted(pin.id, action)) return;
    setBusy(action);
    markReacted(pin.id, action);
    setLocal((s) => ({ ...s, [action]: s[action] + 1 }));
    try {
      await reactPin(pin.id, action);
      qc.invalidateQueries({ queryKey: ["pins"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch {
      /* optimistic */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="vk-fadeup min-w-[220px] max-w-[250px] font-sans text-[#e8e8ea]">
      <div className="flex items-center gap-1.5">
        {flag && <span className="text-lg leading-none">{flag}</span>}
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: meta.glow, boxShadow: `0 0 8px ${meta.glow}` }} />
        <span className="text-[15px] font-bold">{meta.label}</span>
      </div>

      <div className="mt-1 text-[13px] text-white/60">{pin.name}</div>

      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold">
        {resurrected ? (
          <span className="flex items-center gap-1 text-gold">
            <FireworkIcon size={13} /> back from the dead
          </span>
        ) : pin.online ? (
          <span className="text-emerald-400">🟢 currently online — suffering live</span>
        ) : (
          <span className="text-white/40">⚪ offline · back vibing</span>
        )}
      </div>
      {!resurrected && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px]">
          <span className="text-white/35">🩺 Diagnosis:</span>
          <span className="font-semibold text-coral/85">{diagnosis(pin.id)}</span>
        </div>
      )}

      {pin.message ? (
        <div className="mt-2 border-l-2 border-coral/50 pl-2 text-[13px] italic leading-snug text-white/85">
          “{pin.message}”
        </div>
      ) : (
        <div className="mt-2 border-l-2 border-white/10 pl-2 text-[12px] italic leading-snug text-white/45">
          {eulogy(pin.name, pin.id)}
        </div>
      )}

      <div className="mt-2.5 rounded-lg bg-white/[0.05] px-2 py-2.5 text-center">
        {resurrected ? (
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-1.5 text-base font-bold text-gold">
              <FireworkIcon size={18} /> Resurrected <FireworkIcon size={18} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gold/55">
              {timeAgo(pin.recoverAt, now)}
            </span>
          </div>
        ) : (
          <>
            <div className="text-[12px] uppercase tracking-widest text-white/40">resurrects in</div>
            <div className="font-mono text-xl font-bold text-ember tabular-nums">{formatCountdown(remaining)}</div>
          </>
        )}
      </div>

      <WaitingBadge count={waiting} />

      <div className="mt-2.5">
        {resurrected ? (
          <button
            onClick={() => send("good4u")}
            disabled={hasReacted(pin.id, "good4u")}
            className="w-full rounded-lg bg-gold/15 px-2 py-2.5 text-[13px] font-bold text-gold transition hover:bg-gold/25 disabled:opacity-40"
          >
            💛 Good4U · <CountUp value={local.good4u} />
          </button>
        ) : (
          <button
            onClick={() => send("sympathy")}
            disabled={hasReacted(pin.id, "sympathy")}
            className="w-full rounded-lg bg-emerald-500/15 px-2 py-2.5 text-[13px] font-bold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-40"
          >
            🫂 Extend Sympathy · <CountUp value={local.sympathy} />
          </button>
        )}
      </div>

      <Tally good4u={local.good4u} sympathy={local.sympathy} handshake={pin.handshake} views={pin.views} />
    </div>
  );
}

// Shared reaction footer — the little 💛 · 🫂 · 🤝 · 👁 running tally.
function Tally({ good4u, sympathy, handshake, views }: { good4u: number; sympathy: number; handshake: number; views: number }) {
  return (
    <div className="mt-2 text-center text-[11px] text-white/35">
      💛 {good4u} · 🫂 {sympathy} · 🤝 {handshake} · {views} 👁
    </div>
  );
}

// "You're not alone" — a real person glyph (SVG, never an emoji) with a live
// pulse and the count of everyone currently waiting out the wall.
function WaitingBadge({ count }: { count: number }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-ember/[0.08] px-2 py-1.5">
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/40" />
        <svg viewBox="0 0 24 24" className="relative h-3.5 w-3.5 text-ember" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="7.5" r="3.6" />
          <path d="M12 12.6c-4.1 0-6.8 2.4-7.2 5.6-.12.92.62 1.7 1.55 1.7h11.3c.93 0 1.67-.78 1.55-1.7-.4-3.2-3.1-5.6-7.2-5.6Z" />
        </svg>
      </span>
      <span className="text-[11px] font-semibold text-ember/90">
        <span className="tabular-nums">{count.toLocaleString()}</span> also behind the wall
      </span>
    </div>
  );
}
