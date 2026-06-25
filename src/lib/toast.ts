"use client";

// Tiny dependency-free toast bus. Any component can fire a toast; <Toaster/>
// listens and renders. Avoids prop-drilling a context through the whole tree.

export type ToastTone = "info" | "love" | "achievement" | "warn";

export interface ToastInput {
  title: string;
  body?: string;
  emoji?: string;
  tone?: ToastTone;
  ttl?: number;
}

export interface ToastItem extends Required<Omit<ToastInput, "body">> {
  id: string;
  body?: string;
}

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();

export function toast(input: ToastInput) {
  const item: ToastItem = {
    id: Math.random().toString(36).slice(2),
    title: input.title,
    body: input.body,
    emoji: input.emoji ?? "",
    tone: input.tone ?? "info",
    ttl: input.ttl ?? 5000,
  };
  listeners.forEach((l) => l(item));
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
