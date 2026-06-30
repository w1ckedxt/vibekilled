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

// Durable mirror of the identity. The server (`proxy.ts`) sets `vk_uid` as a
// first-party cookie that survives Safari/iOS ITP wiping localStorage; we mirror
// the id + name here so the anonymous profile persists across visits. Cookie
// names can't contain ":", hence the underscore form.
const COOKIES = {
  uid: "vk_uid",
  name: "vk_name",
};
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/** Stable seed from the (durable) id so the default alias is reproducible —
 *  wipe the name store and the SAME name comes back instead of a random one. */
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

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
  // localStorage-first keeps existing profiles intact; the server-set cookie is
  // the durable fallback when ITP/private-mode has wiped localStorage. Either
  // way we mirror into both so the id survives one store being cleared.
  let v = localStorage.getItem(KEYS.userId) || readCookie(COOKIES.uid);
  if (!v) v = uid();
  localStorage.setItem(KEYS.userId, v);
  writeCookie(COOKIES.uid, v);
  return v;
}

export function getName(): string {
  if (typeof window === "undefined") return "";
  // Custom name (if any) lives in both stores; otherwise derive a stable default
  // from the durable id so a wiped name store regenerates the SAME alias.
  let v = localStorage.getItem(KEYS.name) || readCookie(COOKIES.name);
  if (!v) v = devName(seedFromId(getUserId()));
  localStorage.setItem(KEYS.name, v);
  writeCookie(COOKIES.name, v);
  return v;
}

export function setName(v: string) {
  localStorage.setItem(KEYS.name, v);
  writeCookie(COOKIES.name, v);
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
