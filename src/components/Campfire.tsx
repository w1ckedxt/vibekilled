"use client";

import { useCallback, useEffect, useState } from "react";
import { useMyPin, useNow } from "@/lib/hooks";
import { getName, getUserId } from "@/lib/identity";
import { joinCampfire, reportTetris } from "@/lib/api";
import { LolReads } from "./LolReads";
import { Tetris } from "./Tetris";
import type { ProviderId } from "@/lib/types";

// The Campfire is your "waiting room" behind the wall — it lives right on your
// own status card so it shows the instant you go down (no map/popup timing). A
// little arcade to kill the time: a fully-playable Tetris and the LOLReads
// library. Renders nothing once you've resurrected (the card handles that).
export function Campfire({ myPinId, myProvider }: { myPinId: string; myProvider: ProviderId }) {
  const { data: pin } = useMyPin(myPinId);
  const now = useNow();
  const remaining = pin ? pin.recoverAt - now : 1;
  const open = remaining > 0 && !pin?.resurrected;
  const [live, setLive] = useState(0);
  const [tetrisOpen, setTetrisOpen] = useState(false);

  // Register campfire presence + poll the real "around the fire" count.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const beat = async () => {
      const n = await joinCampfire(getUserId());
      if (alive) setLive(n);
    };
    beat();
    const i = setInterval(beat, 20000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [open]);

  // Tell the server a game wrapped up (best-effort) so the admin journey + the
  // play counter / high score pick it up. Fired once per game by <Tetris>.
  const onTetrisPlayed = useCallback(
    (r: { score: number; lines: number }) => {
      reportTetris({ userId: getUserId(), name: getName(), provider: myProvider, score: r.score, lines: r.lines });
    },
    [myProvider],
  );

  // Resurrected (or gone) → the card shows the celebration; the arcade closes.
  if (!open) return null;

  return (
    <div className="glass pointer-events-auto flex flex-col rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="vk-fire text-base leading-none">🔥</span>
        <span className="text-[12px] font-semibold uppercase tracking-wide text-white/65">Campfire of Hope</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {live} around the fire
        </span>
      </div>

      <div className="space-y-2 p-3">
        <p className="px-0.5 text-[12px] leading-snug text-white/45">
          Nothing to do but wait it out. Stack some blocks or read up on the outside world. 🪵
        </p>

        {/* Tetris launcher — matches the LOLReads tile so the room reads as a menu */}
        <button
          onClick={() => setTetrisOpen(true)}
          className="glass pointer-events-auto flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[0.04]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ember/10 text-xl">🎮</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-white/85">Tetris</span>
            <span className="block truncate text-[11px] text-white/45">stack blocks, kill time behind the wall</span>
          </span>
          <span className="text-lg text-white/30">›</span>
        </button>

        {/* The satirical "how to survive outside" library */}
        <LolReads />
      </div>

      {tetrisOpen && <Tetris onClose={() => setTetrisOpen(false)} onPlayed={onTetrisPlayed} />}
    </div>
  );
}
