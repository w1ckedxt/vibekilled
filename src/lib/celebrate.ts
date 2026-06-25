"use client";

// Dedicated channel for the BIG spectacular reaction moments (separate from the
// little status toasts). When your pin gets love, this fires a left-side splash.

export type CelebrationType = "good4u" | "sympathy" | "handshake";

export interface Celebration {
  id: string;
  type: CelebrationType;
  delta: number;
  total: number;
  emoji: string;
  label: string;
  color: string;
}

const META: Record<CelebrationType, { emoji: string; label: string; color: string }> = {
  good4u: { emoji: "💛", label: "Good4U", color: "#ffd166" },
  sympathy: { emoji: "🫂", label: "Sympathy", color: "#34d399" },
  handshake: { emoji: "🤝", label: "I hear you", color: "#4cc9f0" },
};

type Listener = (c: Celebration) => void;
const listeners = new Set<Listener>();

export function celebrate(type: CelebrationType, delta: number, total: number) {
  const m = META[type];
  const c: Celebration = { id: Math.random().toString(36).slice(2), type, delta, total, ...m };
  listeners.forEach((l) => l(c));
}

export function subscribeCelebrations(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
