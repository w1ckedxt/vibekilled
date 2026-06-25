"use client";

import { useEffect, useRef } from "react";
import { useMyPin, useNow } from "@/lib/hooks";
import { provider } from "@/lib/providers";
import { formatCountdown } from "@/lib/time";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getUnlocked } from "@/lib/identity";
import { toast } from "@/lib/toast";

// The personal panel for someone who's currently down: a big live countdown,
// the love they've collected this session, and their achievement shelf.
export function SessionPanel({ myPinId, onClear, onLogAnother }: { myPinId: string; onClear: () => void; onLogAnother: () => void }) {
  const { data: pin, isFetched } = useMyPin(myPinId);
  const now = useNow();
  const prevGood = useRef<number | null>(null);

  // Pin vanished (expired past grace) → reset so the user can log again.
  useEffect(() => {
    if (isFetched && pin === null) onClear();
  }, [isFetched, pin, onClear]);

  // "10 fellow devs felt your pain" — toast when your Good4U count climbs.
  useEffect(() => {
    if (!pin) return;
    if (prevGood.current !== null && pin.good4u > prevGood.current) {
      const delta = pin.good4u - prevGood.current;
      toast({
        tone: "love",
        emoji: "💛",
        title: `${pin.good4u} fellow dev${pin.good4u === 1 ? "" : "s"} felt your pain`,
        body: `+${delta} just cheered your comeback.`,
      });
    }
    prevGood.current = pin.good4u;
  }, [pin]);

  if (!pin) return null;

  const meta = provider(pin.provider);
  const remaining = pin.recoverAt - now;
  const resurrected = pin.resurrected || remaining <= 0;
  const unlocked = new Set(getUnlocked());

  return (
    <div className="glass pointer-events-auto rounded-2xl p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.glow, boxShadow: `0 0 8px ${meta.glow}` }} />
        <span className="text-xs font-semibold text-white/80">
          {resurrected ? "You made it back" : `Down by ${meta.label}`}
        </span>
      </div>

      {resurrected ? (
        <div className="py-2 text-center">
          <div className="text-2xl font-bold text-gold">✨ You&apos;re alive ✨</div>
          <p className="mt-1 text-xs text-white/50">The quota gods have shown mercy.</p>
          <button
            onClick={onLogAnother}
            className="mt-3 w-full rounded-xl bg-coral py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            Hit it again? 🪦
          </button>
        </div>
      ) : (
        <div className="py-1 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/40">resurrecting in</div>
          <div className="vk-float my-1 font-mono text-4xl font-bold text-ember tabular-nums">
            {formatCountdown(remaining)}
          </div>
          <p className="text-[11px] text-white/40">Hang tight. The whole map can see you suffering.</p>
        </div>
      )}

      {/* Session love */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini value={pin.good4u} label="Good4U" color="text-gold" />
        <Mini value={pin.sympathy} label="sympathy" color="text-coral" />
        <Mini value={pin.views} label="views" color="text-electric" />
      </div>

      {/* Achievements shelf */}
      <div className="mt-3 border-t border-white/8 pt-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wide text-white/40">Achievements</div>
        <div className="flex flex-wrap gap-1.5">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id);
            return (
              <span
                key={a.id}
                title={got ? `${a.title} — ${a.blurb}` : "Locked"}
                className={`rounded-full px-2 py-1 text-[11px] ${got ? "bg-ember/15 text-ember" : "bg-white/5 text-white/25"}`}
              >
                {got ? `${a.emoji} ${a.title}` : "🔒"}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Mini({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-white/5 py-1.5">
      <div className={`font-mono text-base font-bold ${color}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
