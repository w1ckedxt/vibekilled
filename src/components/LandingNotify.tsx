"use client";

import { useEffect, useState } from "react";
import { notifySupported, notifyPermission, requestNotify, landingDismissed, dismissLanding } from "@/lib/notify";
import { toast } from "@/lib/toast";

// The moment you land, offer browser notifications — framed around what you'd
// actually want pinged: a reply at the campfire, sympathy/Good4U coming in, and
// your resurrection. The native OS prompt still only fires on the explicit
// "Enable" tap, so it stays gesture-safe across browsers (Safari/iOS included).
// Shown once per device; reading window/localStorage is gated behind `mounted`
// so the first render matches the server and never trips hydration.
export function LandingNotify() {
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || gone) return null;
  if (!notifySupported() || notifyPermission() !== "default" || landingDismissed()) return null;

  async function enable() {
    const res = await requestNotify();
    dismissLanding();
    setGone(true);
    if (res === "granted") {
      toast({
        tone: "info",
        emoji: "🔔",
        title: "Notifications on",
        body: "We'll ping you for campfire replies, sympathy & your comeback.",
        ttl: 5000,
      });
    }
  }

  function notNow() {
    dismissLanding();
    setGone(true);
  }

  return (
    <div className="glass pointer-events-auto fixed bottom-6 left-3 z-[900] w-[300px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-electric/25 bg-electric/[0.07] p-3.5">
      <p className="text-[13px] font-bold text-white/90">🔔 Don&apos;t miss your people</p>
      <p className="mt-1 text-[12px] leading-snug text-white/60">
        Turn on notifications and we&apos;ll ping you when someone replies at the campfire, sends you sympathy or a
        Good4U — and the second you&apos;re resurrected.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={enable}
          className="flex-1 rounded-lg bg-electric/85 py-2 text-[13px] font-bold text-black transition hover:brightness-110"
        >
          Enable notifications
        </button>
        <button
          onClick={notNow}
          className="rounded-lg border border-white/10 px-3 py-2 text-[13px] font-semibold text-white/55 transition hover:text-white"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
