"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, type ToastItem, type ToastTone } from "@/lib/toast";

const TONE: Record<ToastTone, string> = {
  info: "border-electric/30",
  love: "border-gold/40",
  achievement: "border-ember/50",
  warn: "border-coral/50",
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.ttl);
    });
  }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[1000] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`glass vk-fadeup pointer-events-auto rounded-xl px-4 py-3 ${TONE[t.tone]}`}
        >
          <div className="flex items-start gap-2.5">
            {t.emoji && <span className="text-xl leading-none">{t.emoji}</span>}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{t.title}</div>
              {t.body && <div className="mt-0.5 text-xs text-white/65">{t.body}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
