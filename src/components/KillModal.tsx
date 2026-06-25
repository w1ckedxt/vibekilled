"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PROVIDER_LIST } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";
import { createPin } from "@/lib/api";
import {
  addUnlocked,
  getName,
  getShareLocation,
  getUserId,
  setMyPin,
  setName,
  setShareLocation,
} from "@/lib/identity";
import { toast } from "@/lib/toast";

const PRESETS = [
  { label: "15m", m: 15 },
  { label: "30m", m: 30 },
  { label: "1h", m: 60 },
  { label: "2h", m: 120 },
  { label: "4h", m: 240 },
  { label: "8h", m: 480 },
];

export function KillModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<ProviderId>("claude");
  const [minutes, setMinutes] = useState(60);
  const [share, setShare] = useState(false);
  const [name, setNameState] = useState("");
  const [message, setMessage] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNameState(getName());
      setShare(getShareLocation());
      setError(null);
    }
  }, [open]);

  // Ask for precise location only when the user opts in.
  useEffect(() => {
    if (!share || !open) return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 },
    );
  }, [share, open]);

  function toggleShare(on: boolean) {
    setShare(on);
    setShareLocation(on);
    if (!on) setCoords(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const cleanName = name.trim() || getName();
    setName(cleanName);
    try {
      const res = await createPin({
        userId: getUserId(),
        name: cleanName,
        provider,
        recoveryMinutes: minutes,
        shareLocation: share,
        lat: coords?.lat,
        lng: coords?.lng,
        message: message.trim() || undefined,
      });
      setMyPin(res.pin.id);
      qc.invalidateQueries({ queryKey: ["pins"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["stats"] });

      if (res.achievement) {
        addUnlocked(res.achievement.id);
        toast({
          tone: "achievement",
          emoji: res.achievement.emoji,
          title: `Achievement: ${res.achievement.title}`,
          body: res.achievement.blurb,
          ttl: 7000,
        });
      }
      onCreated(res.pin.id);
      onClose();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      setError(
        err.status === 409
          ? "You're still down — wait for your own resurrection before logging another."
          : err.message || "Something broke. How fitting.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass vk-fadeup relative z-10 w-full max-w-md rounded-t-2xl p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            You hit the wall <span className="text-coral">:(</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">✕</button>
        </div>

        {/* Provider */}
        <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-white/40">Who killed your vibe?</label>
        <div className="mb-4 grid grid-cols-5 gap-1.5">
          {PROVIDER_LIST.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] transition ${
                provider === p.id ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: p.glow, boxShadow: `0 0 8px ${p.glow}` }} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Recovery time */}
        <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-white/40">
          Estimated time to resurrection
        </label>
        <div className="mb-2 grid grid-cols-6 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.m}
              onClick={() => setMinutes(p.m)}
              className={`rounded-lg border py-2 text-xs font-semibold transition ${
                minutes === p.m ? "border-ember/60 bg-ember/15 text-ember" : "border-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="range"
            min={5}
            max={720}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="flex-1 accent-[#ff9f1c]"
          />
          <span className="w-16 text-right font-mono text-xs text-ember">
            {minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim() : `${minutes}m`}
          </span>
        </div>

        {/* Optional message */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          placeholder="Optional: last words… (e.g. 'mid-refactor, of course')"
          className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-electric/50 focus:outline-none"
        />

        {/* Location toggle — privacy first */}
        <button
          onClick={() => toggleShare(!share)}
          className="mb-1 flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-left"
        >
          <span>
            <span className="block text-sm text-white">Share approximate location</span>
            <span className="block text-[11px] text-white/40">
              {share ? "Using a jittered estimate — never your exact spot." : "Off → placed by coarse region only."}
            </span>
          </span>
          <span className={`relative h-6 w-11 rounded-full transition ${share ? "bg-electric/70" : "bg-white/15"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${share ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>
        <p className="mb-4 text-[10px] leading-snug text-white/30">
          🔒 We always estimate &amp; jitter locations. No accounts, no tracking — everything lives in your browser.
        </p>

        {error && <div className="mb-3 rounded-lg bg-coral/15 px-3 py-2 text-xs text-coral">{error}</div>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-xl bg-coral py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Logging your demise…" : "Drop my pin 🪦"}
        </button>
      </div>
    </div>
  );
}
