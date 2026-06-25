"use client";

import type { FeedEvent, GlobalStats, Pin, ProviderId } from "./types";
import type { Achievement } from "./achievements";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? res.statusText), { status: res.status, data });
  return data as T;
}

export async function fetchPins(): Promise<Pin[]> {
  return (await jsonOrThrow<{ pins: Pin[] }>(await fetch("/api/pins", { cache: "no-store" }))).pins;
}

export async function fetchPin(id: string): Promise<Pin | null> {
  const res = await fetch(`/api/pins/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  return (await jsonOrThrow<{ pin: Pin }>(res)).pin;
}

export async function fetchFeed(): Promise<FeedEvent[]> {
  return (await jsonOrThrow<{ events: FeedEvent[] }>(await fetch("/api/feed", { cache: "no-store" }))).events;
}

export async function fetchStats(): Promise<GlobalStats> {
  return (await jsonOrThrow<{ stats: GlobalStats }>(await fetch("/api/stats", { cache: "no-store" }))).stats;
}

export interface CreatePayload {
  userId: string;
  name: string;
  provider: ProviderId;
  recoveryMinutes: number;
  shareLocation: boolean;
  lat?: number;
  lng?: number;
  message?: string;
}

export interface CreateResponse {
  pin: Pin;
  killCount: number;
  achievement: Achievement | null;
}

export async function createPin(payload: CreatePayload): Promise<CreateResponse> {
  return jsonOrThrow<CreateResponse>(
    await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function reactPin(id: string, action: "good4u" | "sympathy" | "view"): Promise<Pin> {
  return (
    await jsonOrThrow<{ pin: Pin }>(
      await fetch(`/api/pins/${id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }),
    )
  ).pin;
}
