"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchFeed, fetchPin, fetchPins, fetchStats } from "./api";

export function usePins() {
  return useQuery({ queryKey: ["pins"], queryFn: fetchPins, refetchInterval: 4000 });
}

export function useFeed() {
  return useQuery({ queryKey: ["feed"], queryFn: fetchFeed, refetchInterval: 5000 });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: fetchStats, refetchInterval: 6000 });
}

export function useMyPin(id: string | null) {
  return useQuery({
    queryKey: ["pin", id],
    queryFn: () => fetchPin(id as string),
    enabled: Boolean(id),
    refetchInterval: 3000,
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
