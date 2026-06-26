"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import type { Pin } from "@/lib/types";

// "Wall Weather" — a satirical storm overlay. Bins currently-down devs into a
// coarse grid and draws translucent weather blobs sized/coloured by how many are
// suffering there. Toggleable; pins stay visible underneath.
interface Cell {
  lat: number;
  lng: number;
  count: number;
}

const GRID = 12; // degrees — coarse on purpose (privacy + readability)

function bins(pins: Pin[]): Cell[] {
  const m = new Map<string, { lat: number; lng: number; count: number }>();
  for (const p of pins) {
    if (p.resurrected) continue; // only active storms
    const gy = Math.round(p.lat / GRID) * GRID;
    const gx = Math.round(p.lng / GRID) * GRID;
    const key = `${gy},${gx}`;
    const e = m.get(key) ?? { lat: 0, lng: 0, count: 0 };
    e.lat += p.lat;
    e.lng += p.lng;
    e.count += 1;
    m.set(key, e);
  }
  return [...m.values()].map((e) => ({ lat: e.lat / e.count, lng: e.lng / e.count, count: e.count }));
}

function look(count: number): { color: string; emoji: string; label: string } {
  if (count >= 6) return { color: "#ff5e5b", emoji: "⛈️", label: "429 storm" };
  if (count >= 3) return { color: "#ff9f1c", emoji: "🌧️", label: "rate-limit drizzle" };
  return { color: "#4cc9f0", emoji: "🌤️", label: "scattered outages" };
}

export function WallWeather({ pins }: { pins: Pin[] }) {
  const cells = bins(pins);
  return (
    <>
      {cells.map((c, i) => {
        const l = look(c.count);
        const radius = Math.min(48, 16 + c.count * 6);
        return (
          <CircleMarker
            key={`${c.lat.toFixed(1)},${c.lng.toFixed(1)},${i}`}
            center={[c.lat, c.lng]}
            radius={radius}
            pathOptions={{ color: l.color, fillColor: l.color, fillOpacity: 0.16, opacity: 0.45, weight: 1 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              {l.emoji} {l.label} · {c.count} down
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
