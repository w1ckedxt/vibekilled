"use client";

// All user state lives in localStorage — no accounts, privacy by default.

import { devName } from "./names";

const KEYS = {
  userId: "vk:userId",
  name: "vk:name",
  myPin: "vk:myPin", // id of the pin you currently have live
  shareLocation: "vk:shareLocation",
  reactions: "vk:reactions", // JSON: { [pinId]: ["good4u","sympathy"] }
  achievements: "vk:achievements", // JSON string[] of unlocked ids
  quests: "vk:quests", // JSON string[] of pinIds whose touch-grass quest is done
  visited: "vk:visited", // set once this device has been welcomed (gates seeding)
};

/** True exactly once per device — the first time it's ever called. Used so a
 *  brand-new visitor seeds nearby ambient devs, but refreshes never re-spawn. */
export function takeFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(KEYS.visited)) return false;
  localStorage.setItem(KEYS.visited, "1");
  return true;
}

function uid(): string {
  // Small, dependency-free id; identity is non-sensitive.
  return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(KEYS.userId);
  if (!v) {
    v = uid();
    localStorage.setItem(KEYS.userId, v);
  }
  return v;
}

export function getName(): string {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(KEYS.name);
  if (!v) {
    v = devName();
    localStorage.setItem(KEYS.name, v);
  }
  return v;
}

export function setName(v: string) {
  localStorage.setItem(KEYS.name, v);
}

export function getShareLocation(): boolean {
  if (typeof window === "undefined") return false;
  // Default: do NOT use precise GPS (privacy first). Opt-in only.
  return localStorage.getItem(KEYS.shareLocation) === "1";
}

export function setShareLocation(on: boolean) {
  localStorage.setItem(KEYS.shareLocation, on ? "1" : "0");
}

export function getMyPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.myPin);
}

export function setMyPin(id: string | null) {
  if (id) localStorage.setItem(KEYS.myPin, id);
  else localStorage.removeItem(KEYS.myPin);
}

// ── Reactions (client-side dedupe) ────────────────────────────────────────────
function readReactions(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS.reactions) ?? "{}");
  } catch {
    return {};
  }
}

export function hasReacted(pinId: string, action: string): boolean {
  return (readReactions()[pinId] ?? []).includes(action);
}

export function markReacted(pinId: string, action: string) {
  const all = readReactions();
  const set = new Set(all[pinId] ?? []);
  set.add(action);
  all[pinId] = [...set];
  localStorage.setItem(KEYS.reactions, JSON.stringify(all));
}

/** Dev helper: wipe reaction history so you can give sympathy/good4u again. */
export function clearReactions() {
  localStorage.removeItem(KEYS.reactions);
}

// ── Achievements ──────────────────────────────────────────────────────────────
export function getUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.achievements) ?? "[]");
  } catch {
    return [];
  }
}

export function addUnlocked(id: string) {
  const set = new Set(getUnlocked());
  set.add(id);
  localStorage.setItem(KEYS.achievements, JSON.stringify([...set]));
}

// ── Touch-grass quests (per pin, local-only) ──────────────────────────────────
function readQuests(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.quests) ?? "[]");
  } catch {
    return [];
  }
}

export function isQuestDone(pinId: string): boolean {
  return readQuests().includes(pinId);
}

export function markQuestDone(pinId: string) {
  const set = new Set(readQuests());
  set.add(pinId);
  localStorage.setItem(KEYS.quests, JSON.stringify([...set].slice(-50)));
}
