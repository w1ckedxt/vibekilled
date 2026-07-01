"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchFeed, fetchLeaderboard, fetchMe, fetchPin, fetchPins, fetchStats, sendHeartbeat } from "./api";
import { getUserId } from "./identity";

export function usePins() {
  return useQuery({ queryKey: ["pins"], queryFn: fetchPins, refetchInterval: 4000 });
}

export function useFeed() {
  return useQuery({ queryKey: ["feed"], queryFn: fetchFeed, refetchInterval: 5000 });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: fetchStats, refetchInterval: 6000 });
}

export function useLeaderboard() {
  return useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard, refetchInterval: 8000 });
}

export function useMe(userId: string | null) {
  return useQuery({
    queryKey: ["me", userId],
    queryFn: () => fetchMe(userId as string),
    enabled: Boolean(userId),
    refetchInterval: 6000,
  });
}

/** Heartbeat presence + live online count. One ping now, then every 25s. */
export function usePresence(): number {
  const [online, setOnline] = useState(0);
  const idRef = useRef<string>("");
  useEffect(() => {
    idRef.current = getUserId();
    let alive = true;
    const beat = async () => {
      const n = await sendHeartbeat(idRef.current);
      if (alive) setOnline(n);
    };
    beat();
    const t = setInterval(beat, 25000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return online;
}

export function useMyPin(id: string | null) {
  return useQuery({
    queryKey: ["pin", id],
    queryFn: () => fetchPin(id as string),
    enabled: Boolean(id),
    refetchInterval: 3000,
    // Keep polling YOUR pin even when the tab is backgrounded, so incoming
    // sympathy / Good4U can fire a browser notification while you're off coding.
    refetchIntervalInBackground: true,
  });
}

/** A 1s ticking clock for live countdowns. Returns Date.now() each second. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
