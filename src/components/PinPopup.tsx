"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Pin } from "@/lib/types";
import { provider } from "@/lib/providers";
import { flagEmoji } from "@/lib/geo";
import { reactPin } from "@/lib/api";
import { hasReacted, markReacted } from "@/lib/identity";
import { formatCountdown } from "@/lib/time";
import { useNow } from "@/lib/hooks";
import { CountUp } from "./CountUp";
import { Campfire } from "./Campfire";

export function PinPopup({ pin, isMine }: { pin: Pin; isMine: boolean }) {
  const meta = provider(pin.provider);
  const now = useNow();
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

      {/* Presence status */}
      <div className="mt-1 text-[11px] font-semibold">
        {resurrected ? (
          <span className="text-gold">🎆 back from the dead</span>
        ) : pin.online ? (
          <span className="text-emerald-400">🟢 currently online — suffering live</span>
        ) : (
          <span className="text-white/40">⚪ offline · back vibing</span>
        )}
      </div>

      {pin.message && (
        <div className="mt-2 border-l-2 border-coral/50 pl-2 text-[13px] italic leading-snug text-white/85">
          “{pin.message}”
        </div>
      )}

      <div className="mt-2.5 rounded-lg bg-white/[0.05] px-2 py-2.5 text-center">
        {resurrected ? (
          <span className="text-base font-bold text-gold">🎆 Resurrected 🎆</span>
        ) : (
          <>
            <div className="text-[12px] uppercase tracking-widest text-white/40">resurrects in</div>
            <div className="font-mono text-xl font-bold text-ember tabular-nums">{formatCountdown(remaining)}</div>
          </>
        )}
      </div>

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

      {/* The Campfire hangs right off YOUR card, on the map. */}
      {isMine && (
        <div className="mt-3 -mx-3 -mb-3">
          <Campfire myPinId={pin.id} myProvider={pin.provider} />
        </div>
      )}
    </div>
  );
}
