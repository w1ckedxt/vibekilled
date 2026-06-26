"use client";

// A short, dramatic full-screen beat the moment your pin lands: a skull slams in
// with a "DROPPED" stamp and a shockwave ring. Keyed on `seq` so each new drop
// replays the animation. Purely decorative — never blocks the map.
export function DropFlash({ seq, diagnosis }: { seq: number; diagnosis?: string }) {
  if (!seq) return null;
  return (
    <div key={seq} className="pointer-events-none fixed inset-0 z-[950] grid place-items-center">
      <span className="vk-drop-ring absolute h-28 w-28 rounded-full border-2 border-coral" />
      <span className="vk-drop-ring absolute h-28 w-28 rounded-full border border-coral/60" style={{ animationDelay: "0.12s" }} />
      <div className="vk-drop-flash flex flex-col items-center">
        <span className="text-[5.5rem] leading-none drop-shadow-[0_0_34px_rgba(255,94,91,0.85)]" aria-hidden>
          💀
        </span>
        <span className="mt-1 text-2xl font-black uppercase tracking-[0.35em] text-coral drop-shadow-[0_0_18px_rgba(255,94,91,0.7)]">
          Dropped
        </span>
        {diagnosis && (
          <span className="mt-2 rounded-full bg-black/50 px-3 py-1 text-[12px] font-semibold text-white/80 backdrop-blur-sm">
            🩺 Cause: {diagnosis}
          </span>
        )}
      </div>
    </div>
  );
}
