"use client";

// Browser resurrection notifications. We ask for permission only AFTER a pin is
// successfully dropped (never on the way in), then fire a single notification the
// moment that pin's wall lifts — to pull the dev back to celebrate.
//
// Scope note: a page-fired Notification reaches a backgrounded tab but not a fully
// closed one. True closed-tab delivery would need Web Push (service worker + VAPID
// + a server push on resurrection) — a clean future upgrade that slots in here.

const NOTIFIED_KEY = "vk:notifiedPins"; // pin ids we've already pinged (dedupe)
const DISMISSED_KEY = "vk:notifyDismissed"; // pin ids whose prompt was waved off
const LANDING_KEY = "vk:notifyLandingDismissed"; // the on-arrival prompt was waved off

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : "denied";
}

export async function requestNotify(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// ── Tiny capped-set helpers in localStorage ───────────────────────────────────
function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

function addToSet(key: string, value: string) {
  const set = readSet(key);
  set.add(value);
  localStorage.setItem(key, JSON.stringify([...set].slice(-50)));
}

export function promptDismissed(pinId: string): boolean {
  return readSet(DISMISSED_KEY).has(pinId);
}

export function dismissPrompt(pinId: string) {
  addToSet(DISMISSED_KEY, pinId);
}

// ── On-arrival prompt (shown once per device, the moment you land) ─────────────
export function landingDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(LANDING_KEY) === "1";
}

export function dismissLanding() {
  if (typeof window !== "undefined") localStorage.setItem(LANDING_KEY, "1");
}

/** Fire the resurrection ping for a pin, exactly once, only while the tab is in
 *  the background (a focused tab already shows the in-page celebration). */
export function fireResurrection(pinId: string) {
  if (notifyPermission() !== "granted") return;
  if (readSet(NOTIFIED_KEY).has(pinId)) return;
  // Focused tab → the page itself celebrates; a notification would be redundant.
  if (typeof document !== "undefined" && document.hasFocus()) return;
  addToSet(NOTIFIED_KEY, pinId);
  try {
    const n = new Notification("✨ You're resurrected!", {
      body: "Visit VibeKilled.rip to celebrate 🎉",
      icon: "/sally-face.png",
      tag: `vk-resurrection-${pinId}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* notifications can throw on some platforms — failing silently is fine */
  }
}

// ── Incoming-love pings (sympathy / Good4U / handshake on YOUR pin) ────────────
const REACTION_COPY: Record<string, { title: string; body: string }> = {
  sympathy: { title: "🫂 Sympathy incoming", body: "A dev just extended sympathy while you're down." },
  good4u: { title: "💛 Good4U", body: "Someone sent you a Good4U behind the wall." },
  handshake: { title: "🤝 I hear you", body: "A dev acknowledged your pain at the wall." },
};

/** Ping the downed dev when love lands on their pin — only while the tab is in
 *  the background (a focused tab already shows the in-page celebration). A
 *  per-kind tag collapses a flurry of the same reaction into one updating ping
 *  instead of stacking a dozen popups. */
export function fireReaction(kind: "sympathy" | "good4u" | "handshake") {
  if (notifyPermission() !== "granted") return;
  if (typeof document !== "undefined" && document.hasFocus()) return;
  const copy = REACTION_COPY[kind];
  if (!copy) return;
  try {
    const n = new Notification(copy.title, {
      body: copy.body,
      icon: "/sally-face.png",
      tag: `vk-reaction-${kind}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* notifications can throw on some platforms — failing silently is fine */
  }
}
