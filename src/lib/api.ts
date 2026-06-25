"use client";

import type { ChatMessage, FeedEvent, GlobalStats, Pin, ProviderId } from "./types";
import type { Achievement } from "./achievements";
import { getUserId } from "./identity";

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

export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
  good4u: number;
  sympathy: number;
}

export async function fetchLeaderboard(): Promise<LeaderRow[]> {
  return (await jsonOrThrow<{ leaderboard: LeaderRow[] }>(await fetch("/api/leaderboard", { cache: "no-store" }))).leaderboard;
}

export async function fetchChat(userId: string): Promise<ChatMessage[]> {
  return (
    await jsonOrThrow<{ messages: ChatMessage[] }>(
      await fetch(`/api/chat?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
    )
  ).messages;
}

export async function sendChat(payload: { userId: string; name: string; provider: ProviderId; text: string }): Promise<ChatMessage> {
  return (
    await jsonOrThrow<{ message: ChatMessage }>(
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    )
  ).message;
}

export interface MeStats {
  kills: number;
  good4u: number;
  sympathy: number;
  score: number;
  rank: number | null;
  gaveGood4u: number;
  gaveSympathy: number;
  gaveHandshake: number;
  comments: number;
  downMinutes: number;
  streak: number;
}

export async function joinCampfire(userId: string): Promise<number> {
  try {
    const res = await fetch("/api/chat/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return (await res.json()).live ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchMe(userId: string): Promise<MeStats> {
  return jsonOrThrow<MeStats>(await fetch(`/api/me?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }));
}

export async function sendHeartbeat(sessionId: string): Promise<number> {
  try {
    const res = await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    return (await res.json()).online ?? 0;
  } catch {
    return 0;
  }
}

export async function reactPin(id: string, action: "good4u" | "sympathy" | "handshake" | "view"): Promise<Pin> {
  return (
    await jsonOrThrow<{ pin: Pin }>(
      await fetch(`/api/pins/${id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: getUserId() }),
      }),
    )
  ).pin;
}
