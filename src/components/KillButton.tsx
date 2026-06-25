"use client";

export function KillButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="vk-pulse pointer-events-auto rounded-full bg-coral px-7 py-4 text-base font-bold text-black shadow-2xl transition hover:scale-105 hover:brightness-110 active:scale-95"
    >
      I&apos;ve hit it <span className="opacity-70">:(</span>
    </button>
  );
}
