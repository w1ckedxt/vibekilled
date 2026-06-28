"use client";

import { useEffect, useState } from "react";
import type { Pin } from "@/lib/types";
import {
  notifySupported,
  notifyPermission,
  requestNotify,
  fireResurrection,
  promptDismissed,
  dismissPrompt,
} from "@/lib/notify";
import { toast } from "@/lib/toast";

// Lives on your status card while you're down. Two jobs:
//   1. Right after your pin is placed, offer to enable resurrection notifications
//      (the native prompt only fires on the explicit "Enable" click — gesture-safe
//      across browsers, Safari included).
//   2. Once granted, schedule a single ping for the exact moment you come back —
//      a precise timer so it still fires in a backgrounded tab.
const MAX_TIMEOUT = 2_147_000_000; // setTimeout ceiling (~24.8 days)

export function ResurrectionNotify({ pin }: { pin: Pin }) {
  // Client-only component (it mounts after a pin is placed), so reading the live
  // browser permission as the lazy initial value is hydration-safe.
  const [perm, setPerm] = useState<NotificationPermission>(() => notifyPermission());
  const [dismissed, setDismissed] = useState(false);

  // Schedule the comeback ping at recoverAt (or fire now if already past).
  useEffect(() => {
    if (perm !== "granted") return;
    const ms = pin.recoverAt - Date.now();
    if (pin.resurrected || ms <= 0) {
      fireResurrection(pin.id);
      return;
    }
    const t = setTimeout(() => fireResurrection(pin.id), Math.min(ms, MAX_TIMEOUT));
    return () => clearTimeout(t);
  }, [perm, pin.id, pin.recoverAt, pin.resurrected]);

  // Offer the prompt once per down-session, before you've come back.
  const show =
    notifySupported() && perm === "default" && !pin.resurrected && !dismissed && !promptDismissed(pin.id);
  if (!show) return null;

  async function enable() {
    const res = await requestNotify();
    setPerm(res);
    setDismissed(true);
    if (res === "granted") {
      toast({
        tone: "info",
        emoji: "🔔",
        title: "Notifications on",
        body: "We'll ping you the moment your wall lifts.",
        ttl: 5000,
      });
    }
  }

  function notNow() {
    dismissPrompt(pin.id);
    setDismissed(true);
  }

  return (
    <div className="mt-3 rounded-xl border border-electric/25 bg-electric/[0.07] p-3">
      <p className="text-[13px] font-semibold text-white/85">🔔 Get pinged when you&apos;re back</p>
      <p className="mt-0.5 text-[12px] leading-snug text-white/55">
        We&apos;ll send a browser notification the second your wall lifts — so you can get back to shipping (and
        celebrate).
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
