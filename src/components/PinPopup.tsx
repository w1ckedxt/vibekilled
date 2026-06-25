"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Pin } from "@/lib/types";
import { provider } from "@/lib/providers";
import { reactPin } from "@/lib/api";
import { hasReacted, markReacted } from "@/lib/identity";
import { formatCountdown } from "@/lib/time";
import { useNow } from "@/lib/hooks";

export function PinPopup({ pin, isMine }: { pin: Pin; isMine: boolean }) {
  const meta = provider(pin.provider);
  const now = useNow();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState({ good4u: pin.good4u, sympathy: pin.sympathy });
  const remaining = pin.recoverAt - now;
  const resurrected = pin.resurrected || remaining <= 0;

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
      /* optimistic — ignore network hiccups */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-w-[200px] font-sans text-[#e8e8ea]">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: meta.glow, boxShadow: `0 0 8px ${meta.glow}` }}
        />
        <span className="text-sm font-semibold">{meta.label}</span>
        {isMine && <span className="text-[10px] text-electric">· you</span>}
      </div>

      <div className="mt-1 text-xs text-white/60">{pin.name}</div>
      {pin.message && <div className="mt-1 text-xs italic text-white/80">“{pin.message}”</div>}

      <div className="mt-2 rounded-md bg-white/5 px-2 py-1.5 text-center">
        {resurrected ? (
          <span className="text-sm font-semibold text-gold">✨ Resurrected ✨</span>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wide text-white/40">resurrects in</div>
            <div className="font-mono text-base font-semibold text-ember">{formatCountdown(remaining)}</div>
          </>
        )}
      </div>

      {!isMine && (
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={() => send("good4u")}
            disabled={hasReacted(pin.id, "good4u")}
            className="flex-1 rounded-md bg-gold/15 px-2 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/25 disabled:opacity-40"
          >
            Good4U · {local.good4u}
          </button>
          {!resurrected && (
            <button
              onClick={() => send("sympathy")}
              disabled={hasReacted(pin.id, "sympathy")}
              className="flex-1 rounded-md bg-coral/15 px-2 py-1.5 text-xs font-semibold text-coral transition hover:bg-coral/25 disabled:opacity-40"
            >
              Sympathy · {local.sympathy}
            </button>
          )}
        </div>
      )}

      <div className="mt-1.5 text-center text-[10px] text-white/30">
        {pin.views} views · approx. location
      </div>
    </div>
  );
}
