"use client";

import { useEffect, useRef } from "react";
import { useMyPin, useNow } from "@/lib/hooks";
import { provider } from "@/lib/providers";
import { formatCountdown } from "@/lib/time";
import { celebrate } from "@/lib/celebrate";
import { ShareButton } from "./ShareButton";

// Your own card while you're down: a big live countdown + share. Incoming love
// is celebrated spectacularly on the LEFT (ReactionFX), not as a status toast.
// All-time stats + medals live in the left Medals panel — kept out of here.
export function SessionPanel({
  myPinId,
  onClear,
  onLogAnother,
}: {
  myPinId: string;
  onClear: () => void;
  onLogAnother: () => void;
}) {
  const { data: pin, isFetched } = useMyPin(myPinId);
  const now = useNow();
  const prev = useRef<{ good4u: number; sympathy: number; handshake: number } | null>(null);

  // Pin vanished (expired past grace) → reset so the user can log again.
  useEffect(() => {
    if (isFetched && pin === null) onClear();
  }, [isFetched, pin, onClear]);

  // Fire the spectacular left-side splash whenever a count climbs.
  useEffect(() => {
    if (!pin) return;
    const p = prev.current;
    if (p) {
      if (pin.sympathy > p.sympathy) celebrate("sympathy", pin.sympathy - p.sympathy, pin.sympathy);
      if (pin.good4u > p.good4u) celebrate("good4u", pin.good4u - p.good4u, pin.good4u);
      if (pin.handshake > p.handshake) celebrate("handshake", pin.handshake - p.handshake, pin.handshake);
    }
    prev.current = { good4u: pin.good4u, sympathy: pin.sympathy, handshake: pin.handshake };
  }, [pin]);

  if (!pin) return null;

  const meta = provider(pin.provider);
  const remaining = pin.recoverAt - now;
  const resurrected = pin.resurrected || remaining <= 0;

  return (
    <div className="glass pointer-events-auto rounded-2xl p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: meta.glow, boxShadow: `0 0 8px ${meta.glow}` }} />
        <span className="text-sm font-semibold text-white/85">
          {resurrected ? "You made it back" : `Down by ${meta.label}`}
        </span>
      </div>

      {resurrected ? (
        <div className="py-2 text-center">
          <div className="text-2xl font-bold text-gold">✨ You&apos;re alive ✨</div>
          <p className="mt-1 text-[13px] text-white/55">The quota gods have shown mercy.</p>
          <button
            onClick={onLogAnother}
            className="mt-3 w-full rounded-xl bg-coral py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            Hit it again? 🪦
          </button>
        </div>
      ) : (
        <div className="py-1 text-center">
          <div className="text-[11px] uppercase tracking-widest text-white/45">resurrecting in</div>
          <div className="vk-float my-1 font-mono text-4xl font-bold text-ember tabular-nums">
            {formatCountdown(remaining)}
          </div>
          <p className="text-[13px] text-white/45">Hang tight. The whole map can see you suffering.</p>
        </div>
      )}

      <ShareButton resurrected={resurrected} className="mt-3 w-full" />
    </div>
  );
}
