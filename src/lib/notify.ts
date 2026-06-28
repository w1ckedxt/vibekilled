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
