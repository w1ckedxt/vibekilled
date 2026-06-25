"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChat, useMyPin, useNow } from "@/lib/hooks";
import { provider } from "@/lib/providers";
import { getName, getUserId } from "@/lib/identity";
import { sendChat, joinCampfire } from "@/lib/api";
import { formatCountdown, formatLeft, timeAgo } from "@/lib/time";
import { toast } from "@/lib/toast";
import type { ProviderId } from "@/lib/types";

// The Campfire is bolted onto YOUR card — visible only while your timer runs.
// A short "joining the campfire" beat, then a persistent chat that closes (and
// kicks you out) the moment you resurrect. The clock is always ticking. 🔥
export function Campfire({ myPinId, myProvider }: { myPinId: string; myProvider: ProviderId }) {
  const { data: pin } = useMyPin(myPinId);
  const now = useNow();
  const remaining = pin ? pin.recoverAt - now : 1;
  const open = remaining > 0 && !pin?.resurrected;
  const { data: messages } = useChat(open);
  const qc = useQueryClient();
  const [joined, setJoined] = useState(false);
  const [live, setLive] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // You only see the fire from the moment YOU sat down (when your pin/timer
  // started), never the older backlog. Anchoring to the pin's createdAt (server
  // data, stable across reloads) means a refresh keeps your whole session
  // visible instead of resetting the window to "now" and wiping the chat.
  // mountedAt is only a fallback for the brief moment before the pin loads.
  const mountedAt = useRef<number>(Date.now() - 1000);
  const joinedAt = pin?.createdAt ?? mountedAt.current;
  const visible = (messages ?? []).filter((m) => m.at >= joinedAt);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  async function send() {
    const t = text.trim();
    if (!t || sending || !open) return;
    setSending(true);
    try {
      await sendChat({ userId: getUserId(), name: getName(), provider: myProvider, text: t });
      setText("");
      qc.invalidateQueries({ queryKey: ["chat"] });
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string };
      toast({ tone: "warn", emoji: "🔥", title: "Not sent", body: err.data?.message ?? err.message ?? "Try again." });
    } finally {
      setSending(false);
    }
  }

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
    <div className="glass pointer-events-auto !rounded-t-none flex max-h-[42vh] flex-col rounded-2xl border-t border-ember/20 sm:max-h-[46vh]">
      <div className="border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="vk-fire text-base leading-none">🔥</span>
          <span className="text-[12px] font-semibold uppercase tracking-wide text-white/65">Campfire of Hope</span>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {live} warming up
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-ember/10 py-1 text-[12px] font-semibold text-ember">
          ⏳ <span className="font-mono">{formatCountdown(remaining)}</span> of campfire left — talk while you can
        </div>
      </div>

      <div ref={scrollRef} className="vk-scroll flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
        {!visible.length && <div className="py-4 text-center text-[13px] text-white/35">The fire is quiet. Warm it up. 🪵</div>}
        {visible.map((m) => {
          const p = provider(m.provider);
          const left = m.recoverAt ? formatLeft(m.recoverAt - now) : "";
          return (
            <div key={m.id} className="vk-fadeup">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.glow }} />
                <span className="text-[12px] font-semibold text-white/60">{m.name}</span>
                {left && (
                  <span className="rounded-full bg-ember/10 px-1.5 py-px font-mono text-[10px] font-semibold text-ember">
                    ⏳ {left}
                  </span>
                )}
                <span className="ml-auto text-[11px] text-white/25">{timeAgo(m.at, now)}</span>
              </div>
              <p className="ml-3 text-[13px] leading-snug text-white/85">{m.text}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/8 p-2">
        <div className="flex gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Say something warm…"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-ember/50 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="rounded-lg bg-ember/20 px-3 py-2 text-[13px] font-bold text-ember transition hover:bg-ember/30 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
