"use client";

import { useState } from "react";
import { grassQuest } from "@/lib/lore";
import { isQuestDone, markQuestDone } from "@/lib/identity";
import { toast } from "@/lib/toast";

// A tiny wholesome ritual for the wait: one absurd "touch grass" quest, seeded
// per pin. Tick it off before you resurrect for a little dopamine + a badge.
// Local-only (localStorage) — no accounts, no server.
export function TouchGrassQuest({ pinId }: { pinId: string }) {
  const [done, setDone] = useState(() => isQuestDone(pinId));
  const quest = grassQuest(pinId);

  function complete() {
    if (done) return;
    setDone(true);
    markQuestDone(pinId);
    toast({
      tone: "achievement",
      emoji: "🌱",
      title: "Grass: touched",
      body: "Proof you survived the outside. The wall fears you now.",
      ttl: 6000,
    });
  }

  if (done) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2">
        <span className="text-base">🌱</span>
        <span className="text-[12px] font-semibold text-emerald-300">Grass touched — you did the thing.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80">🌱 Touch-grass quest</span>
      </div>
      <p className="mt-1 text-[13px] font-medium text-white/85">{quest}</p>
      <button
        onClick={complete}
        className="mt-2 w-full rounded-lg bg-emerald-500/15 py-2 text-[12px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
      >
        ✅ Done — I touched grass
      </button>
    </div>
  );
}
