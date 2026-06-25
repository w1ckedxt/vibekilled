"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { Pin } from "@/lib/types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  gravity: number;
}

const GOLD = ["#ffd166", "#ffe29a", "#ffb703", "#fff3c4"];
const CORAL = ["#ff5e5b", "#ff8a76", "#ffb3a0", "#b91c1c"];

// Canvas bursts on the map: a coral "death" puff when a kill appears, and a
// golden firework when someone resurrects. Mounted inside MapContainer so it
// can project lat/lng → screen pixels.
export function Fireworks({ pins }: { pins: Pin[] }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparks = useRef<Spark[]>([]);
  const seenKill = useRef<Set<string>>(new Set());
  const seenRise = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const raf = useRef<number>(0);

  useEffect(() => {
    // First load: remember everything WITHOUT bursting (no opening fireworks storm).
    if (!primed.current) {
      for (const p of pins) {
        seenKill.current.add(p.id);
        if (p.resurrected) seenRise.current.add(p.id);
      }
      primed.current = true;
      return;
    }
    for (const p of pins) {
      if (!seenKill.current.has(p.id)) {
        seenKill.current.add(p.id);
        if (!p.resurrected) {
          const pt = map.latLngToContainerPoint([p.lat, p.lng]);
          burst(sparks.current, pt.x, pt.y, CORAL, "death");
        }
      }
      if (p.resurrected && !seenRise.current.has(p.id)) {
        seenRise.current.add(p.id);
        const pt = map.latLngToContainerPoint([p.lat, p.lng]);
        burst(sparks.current, pt.x, pt.y, GOLD, "rise");
      }
    }
  }, [pins, map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const size = map.getSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    map.on("resize", resize);

    const loop = () => {
      const size = map.getSize();
      ctx.clearRect(0, 0, size.x, size.y);
      const live: Spark[] = [];
      for (const s of sparks.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += s.gravity;
        s.vx *= 0.98;
        s.life -= 0.02;
        if (s.life > 0) {
          ctx.globalAlpha = Math.max(0, s.life);
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          live.push(s);
        }
      }
      ctx.globalAlpha = 1;
      sparks.current = live;
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf.current);
      map.off("resize", resize);
    };
  }, [map]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[450]" aria-hidden />;
}

function burst(arr: Spark[], x: number, y: number, palette: string[], kind: "death" | "rise") {
  const n = kind === "rise" ? 48 : 26;
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
    // Death = soft downward puff; Rise = energetic upward firework.
    const speed = kind === "rise" ? 1.6 + Math.random() * 3.6 : 0.8 + Math.random() * 2;
    arr.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === "rise" ? 1 : -0.2),
      life: 0.7 + Math.random() * 0.5,
      color: palette[Math.floor(Math.random() * palette.length)],
      gravity: kind === "rise" ? 0.05 : 0.02,
    });
  }
}
