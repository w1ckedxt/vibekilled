"use client";

import { useRef, useState } from "react";

const R = 47; // ring radius in the 100×100 viewBox
const CIRC = 2 * Math.PI * R;

// The main call-to-action: one big, round, dead-center button. Tapping it charges
// a white ring around the rim ("vollopen"), then BAM — the kill modal opens.
export function KillButton({ onClick }: { onClick: () => void }) {
  const [firing, setFiring] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fire() {
    if (firing) return;
    setFiring(true);
    timer.current = setTimeout(() => {
      onClick(); // open the window once the ring has filled
      setTimeout(() => setFiring(false), 60); // reset for next time
    }, 460);
  }

  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      {/* Playful but chill invite */}
      <div className="glass pointer-events-auto max-w-[280px] rounded-2xl px-4 py-2.5 text-center">
        <p className="text-[13px] font-bold leading-snug text-white">
          Just got rate-limited? <span aria-hidden>💀</span>
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/55">
          Drop it here, soak up the sympathy, and hand some back.
        </p>
      </div>

      {/* The big round prominent CTA — skull over crossed swords */}
      <button
        onClick={fire}
        aria-label="I've been hit — log your kill"
        className={`vk-pulse pointer-events-auto relative grid h-28 w-28 place-items-center rounded-full bg-coral text-black shadow-2xl ring-4 ring-coral/25 transition-transform hover:scale-105 active:scale-95 sm:h-32 sm:w-32 ${
          firing ? "scale-105" : ""
        }`}
      >
        {/* White ring that "fills up" around the rim on tap */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={firing ? 0 : CIRC}
            style={{ transition: firing ? "stroke-dashoffset 0.45s ease-in" : "none" }}
          />
        </svg>

        <span className="flex flex-col items-center leading-none">
          <span className="relative grid place-items-center" aria-hidden>
            <span className="absolute text-[2.75rem] opacity-30">⚔️</span>
            <span className="relative text-4xl drop-shadow-sm">💀</span>
          </span>
          <span className="mt-1.5 text-[10px] font-black uppercase tracking-wider">
            I&apos;ve been hit
          </span>
        </span>
      </button>
    </div>
  );
}
