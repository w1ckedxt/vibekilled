"use client";

import { useRef, useState } from "react";

const R = 47; // ring radius in the 100×100 viewBox
const CIRC = 2 * Math.PI * R;

// The whole CTA lives inside ONE big red orb — no separate card. It floats off the
// map with a deep coral glow, charges a white ring on tap ("vollopen"), then BAM →
// the kill modal. An ✕ dismisses it so you can roam the map; a compact pill brings
// the action back.
export function KillButton({
  variant = "hero",
  onClick,
  onDismiss,
}: {
  variant?: "hero" | "compact";
  onClick: () => void;
  onDismiss?: () => void;
}) {
  const [firing, setFiring] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fire() {
    if (firing) return;
    setFiring(true);
    timer.current = setTimeout(() => {
      onClick();
      setTimeout(() => setFiring(false), 60);
    }, 460);
  }

  if (variant === "compact") {
    return (
      <button
        onClick={fire}
        aria-label="I've been hit — log your kill"
        className="vk-pulse pointer-events-auto flex items-center gap-2 rounded-full bg-coral px-4 py-2.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_12px_40px_-8px_rgba(255,94,91,0.7)] transition hover:scale-105 active:scale-95"
      >
        <span className="text-base" aria-hidden>💀</span>
        I&apos;ve been hit
      </button>
    );
  }

  return (
    <button
      onClick={fire}
      aria-label="I've been hit — log your kill"
      className={`vk-float pointer-events-auto relative grid h-40 w-40 place-items-center rounded-full bg-gradient-to-b from-[#ff7a72] to-coral text-black shadow-[0_28px_70px_-12px_rgba(255,94,91,0.75)] ring-1 ring-white/20 transition-transform duration-200 hover:scale-[1.04] active:scale-95 sm:h-44 sm:w-44 ${
        firing ? "scale-[1.06]" : ""
      }`}
    >
      {/* White ring that "fills up" around the rim on tap */}
      <svg className="pointer-events-none absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={firing ? 0 : CIRC}
          style={{ transition: firing ? "stroke-dashoffset 0.45s ease-in" : "none" }}
        />
      </svg>

      {/* Dismiss — a clear solid badge on the rim; tap away to roam the map */}
      {onDismiss && (
        <span
          role="button"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute -right-1.5 -top-1.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#150f12] text-[15px] font-bold text-white shadow-lg ring-2 ring-white/25 transition hover:scale-110 hover:bg-black"
        >
          ✕
        </span>
      )}

      <span className="flex flex-col items-center leading-none">
        <span className="relative grid place-items-center" aria-hidden>
          <span className="absolute text-[3.25rem] opacity-30">⚔️</span>
          <span className="relative text-[2.75rem] drop-shadow-sm">💀</span>
        </span>
        <span className="mt-2 text-[12px] font-black uppercase tracking-wider">I&apos;ve been hit</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-black/45">
          rate-limited? drop it
        </span>
      </span>
    </button>
  );
}
