"use client";

import { PROVIDER_LIST } from "@/lib/providers";
import type { Pin, ProviderId } from "@/lib/types";

// Filter the map by agent. Tap a chip to toggle that provider's pins.
export function ProviderFilter({
  pins,
  enabled,
  onToggle,
}: {
  pins: Pin[];
  enabled: Set<ProviderId>;
  onToggle: (id: ProviderId) => void;
}) {
  const counts = new Map<ProviderId, number>();
  for (const p of pins) counts.set(p.provider, (counts.get(p.provider) ?? 0) + 1);

  return (
    <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1">
      {PROVIDER_LIST.map((p) => {
        const on = enabled.has(p.id);
        const n = counts.get(p.id) ?? 0;
        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            title={`${p.label} — ${n} down`}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              on ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full transition"
              style={{
                background: p.glow,
                boxShadow: on ? `0 0 8px ${p.glow}` : "none",
                opacity: on ? 1 : 0.4,
              }}
            />
            <span className="hidden sm:inline">{p.label}</span>
            {n > 0 && <span className="font-mono tabular-nums opacity-60">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
