"use client";

// A fast shockwave that rides UP off the top of the screen the instant your pin
// lands — a quick "boom" accent, NOT a curtain. Your card is the star and is
// already open underneath, so this clears out of the way immediately. Keyed on
// `seq` so each new drop replays. Purely decorative — never blocks the map.
export function DropFlash({ seq }: { seq: number; diagnosis?: string }) {
  if (!seq) return null;
  return (
    <div key={seq} className="pointer-events-none fixed inset-x-0 top-[16%] z-[950] grid place-items-center">
      <span className="vk-drop-ring absolute h-24 w-24 rounded-full border-2 border-coral" />
      <span className="vk-drop-ring absolute h-24 w-24 rounded-full border border-coral/60" style={{ animationDelay: "0.1s" }} />
      <div className="vk-drop-flash flex flex-col items-center">
        <span className="text-5xl leading-none drop-shadow-[0_0_28px_rgba(255,94,91,0.85)]" aria-hidden>
          💀
        </span>
        <span className="mt-0.5 text-lg font-black uppercase tracking-[0.35em] text-coral drop-shadow-[0_0_18px_rgba(255,94,91,0.7)]">
          Dropped
        </span>
      </div>
    </div>
  );
}
