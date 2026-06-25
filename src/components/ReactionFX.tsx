"use client";

import { useEffect, useState } from "react";
import { subscribeCelebrations, type Celebration } from "@/lib/celebrate";

// Big, spectacular left-side splash when your pin gets love. Lives center-left
// so it feels like the world is reaching out to YOU — not a status ticker.
export function ReactionFX() {
  const [items, setItems] = useState<Celebration[]>([]);

  useEffect(() => {
    return subscribeCelebrations((c) => {
      setItems((prev) => [...prev, c]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== c.id)), 2200);
    });
  }, []);

  return (
    <div className="pointer-events-none fixed left-4 top-1/2 z-[820] flex -translate-y-1/2 flex-col items-start gap-3 sm:left-10">
      {items.map((c) => (
        <div key={c.id} className="vk-celebrate-card relative flex items-center gap-3">
          <span className="relative grid h-16 w-16 place-items-center">
            <span
              className="vk-burst-ring absolute inset-0 rounded-full border-2"
              style={{ borderColor: c.color }}
            />
            <span className="text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{c.emoji}</span>
          </span>
          <span className="flex flex-col">
            <span className="text-3xl font-extrabold leading-none" style={{ color: c.color, textShadow: `0 0 18px ${c.color}88` }}>
              +{c.delta}
            </span>
            <span className="text-sm font-bold uppercase tracking-wide text-white/85">{c.label}</span>
            <span className="text-xs text-white/45">{c.total} total</span>
          </span>
        </div>
      ))}
    </div>
  );
}
