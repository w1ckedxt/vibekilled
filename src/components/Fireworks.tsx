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
}

const GOLD = ["#ffd166", "#ffe29a", "#ffb703", "#fff3c4"];

// Canvas-based golden particle burst at every pin that just resurrected.
// Mounted inside the MapContainer so it can map lat/lng → screen pixels.
export function Fireworks({ pins }: { pins: Pin[] }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparks = useRef<Spark[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const raf = useRef<number>(0);

  // Detect newly-resurrected pins and spawn bursts at their location.
  useEffect(() => {
    for (const p of pins) {
      if (p.resurrected && !seen.current.has(p.id)) {
        seen.current.add(p.id);
        const pt = map.latLngToContainerPoint([p.lat, p.lng]);
        burst(sparks.current, pt.x, pt.y);
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
        s.vy += 0.05; // gravity
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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[450]"
      aria-hidden
    />
  );
}

function burst(arr: Spark[], x: number, y: number) {
  const n = 46;
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
    const speed = 1.5 + Math.random() * 3.5;
    arr.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 0.8 + Math.random() * 0.5,
      color: GOLD[Math.floor(Math.random() * GOLD.length)],
    });
  }
}
