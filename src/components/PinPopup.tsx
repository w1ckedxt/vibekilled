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

export function PinPopup({ pin, isMine }: { pin: Pin; isMine: boolean }) {
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
    <div className={`vk-fadeup font-sans text-[#e8e8ea] ${isMine ? "w-[300px]" : "min-w-[220px] max-w-[250px]"}`}>
      <div className="flex items-center gap-1.5">
        {flag && <span className="text-lg leading-none">{flag}</span>}
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: meta.glow, boxShadow: `0 0 8px ${meta.glow}` }} />
        <span className="text-[15px] font-bold">{meta.label}</span>
        {isMine && <span className="ml-auto rounded-full bg-electric/15 px-2 py-0.5 text-[12px] font-bold uppercase text-electric">you</span>}
      </div>

      <div className="mt-1 text-[13px] text-white/60">{pin.name}</div>

      {/* Presence + diagnosis are for OTHERS reading your stone — hidden on your
          own card to keep it clean (you already know you're down). */}
      {!isMine && (
        <>
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
        </>
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

      {/* Countdown box — shown for everyone now (your own arcade + stats live on
          your status card, not in this map popup). */}
      {(
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
      )}

      {/* YOUR card is the universe behind the wall — the arcade sits right up top
          so Tetris / LOLReads are the first thing you reach, not buried. */}
      {isMine && !resurrected && (
        <div className="mt-3">
          <Campfire myPinId={pin.id} myProvider={pin.provider} />
        </div>
      )}

      {/* You're not alone behind the wall — live count of everyone waiting it out. */}
      <WaitingBadge count={waiting} />

      {!isMine && (
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
      )}

      <div className="mt-2 text-center text-[11px] text-white/35">
        💛 {local.good4u} · 🫂 {local.sympathy} · 🤝 {pin.handshake} · {pin.views} 👁
      </div>
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
