"use client";

// The main call-to-action: a playful invite wrapped around one big, round,
// impossible-to-miss button. Tap it → the kill modal opens for an instant drop.
export function KillButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      {/* Playful invite — sets the tone before the BAM */}
      <div className="glass pointer-events-auto max-w-[280px] rounded-2xl px-4 py-2.5 text-center">
        <p className="text-[13px] font-bold leading-snug text-white">
          Just got rate-limited? <span aria-hidden>💀</span>
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/55">
          Drop it here, soak up the sympathy, fling some back — then{" "}
          <span className="font-extrabold text-coral">BAM</span>.
        </p>
      </div>

      {/* The big round prominent CTA — skull over crossed swords */}
      <button
        onClick={onClick}
        aria-label="I've been hit — log your kill"
        className="vk-pulse pointer-events-auto grid h-28 w-28 place-items-center rounded-full bg-coral text-black shadow-2xl ring-4 ring-coral/25 transition hover:scale-105 hover:brightness-110 active:scale-95 sm:h-32 sm:w-32"
      >
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
