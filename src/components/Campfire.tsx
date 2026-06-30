"use client";

import { useCallback, useEffect, useState } from "react";
import { useMyPin, useNow } from "@/lib/hooks";
import { getName, getUserId } from "@/lib/identity";
import { joinCampfire, reportTetris } from "@/lib/api";
import { formatCountdown } from "@/lib/time";
import { LolReads } from "./LolReads";
import { Tetris } from "./Tetris";
import type { ProviderId } from "@/lib/types";

// The Campfire is bolted onto YOUR card — visible only while your timer runs.
// It's the "waiting room" behind the wall: a short joining beat, then a little
// arcade to kill the time — a fully-playable Tetris and the LOLReads library —
// that closes (and kicks you out) the moment you resurrect. The clock ticks. 🔥
export function Campfire({ myPinId, myProvider }: { myPinId: string; myProvider: ProviderId }) {
  const { data: pin } = useMyPin(myPinId);
  const now = useNow();
  const remaining = pin ? pin.recoverAt - now : 1;
  const open = remaining > 0 && !pin?.resurrected;
  const [joined, setJoined] = useState(false);
  const [live, setLive] = useState(0);
  const [tetrisOpen, setTetrisOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setJoined(true), 1500);
    return () => clearTimeout(t);
  }, []);

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

  // Resurrecting drops us into the "fire's out" branch below, which never renders
  // <Tetris> — so it unmounts on its own (and its cleanup reports the game). No
  // need to reconcile tetrisOpen here.

  // Tell the server a game wrapped up (best-effort) so the admin journey + the
  // play counter / high score pick it up. Fired once per game by <Tetris>.
  const onTetrisPlayed = useCallback(
    (r: { score: number; lines: number }) => {
      reportTetris({ userId: getUserId(), name: getName(), provider: myProvider, score: r.score, lines: r.lines });
    },
    [myProvider],
  );

  // ── "Joining the campfire" beat ──
  if (!joined && open) {
    return (
      <div className="glass pointer-events-auto !rounded-t-none flex flex-col items-center justify-center rounded-2xl border-t border-ember/20 py-10">
        <div className="vk-fire text-6xl">🔥</div>
        <div className="mt-3 text-base font-bold text-ember">Joining the campfire…</div>
        <div className="mt-1 text-[13px] text-white/45">pulling up a log behind the wall</div>
      </div>
    );
  }

  // ── Kicked out: timer's done ──
  if (!open) {
    return (
      <div className="glass pointer-events-auto !rounded-t-none rounded-2xl border-t border-white/10 p-6 text-center">
        <div className="text-4xl">🚀</div>
        <div className="mt-2 text-sm font-bold text-white">The fire&apos;s out — back to coding!</div>
        <div className="mt-1 text-[13px] text-white/45">Your time behind the wall is up. Go ship something.</div>
      </div>
    );
  }

  return (
    <div className="glass pointer-events-auto !rounded-t-none flex flex-col rounded-2xl border-t border-ember/20">
      <div className="border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="vk-fire text-base leading-none">🔥</span>
          <span className="text-[12px] font-semibold uppercase tracking-wide text-white/65">Campfire of Hope</span>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {live} around the fire
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-ember/10 py-1 text-[12px] font-semibold text-ember">
          ⏳ <span className="font-mono">{formatCountdown(remaining)}</span> behind the wall — kill the time
        </div>
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
