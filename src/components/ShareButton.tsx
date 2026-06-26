"use client";

import { useStats } from "@/lib/hooks";
import { toast } from "@/lib/toast";

// Viral loop: share your demise / comeback. Uses the native share sheet on
// mobile, falls back to an X (Twitter) compose intent on desktop. Never posts
// automatically — the user confirms in the share UI.
export function ShareButton({
  resurrected = false,
  diagnosis,
  className = "",
}: {
  resurrected?: boolean;
  diagnosis?: string;
  className?: string;
}) {
  const { data } = useStats();

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin : "https://vibekilled.rip";
    const down = data?.active ?? 0;
    const dx = diagnosis ? ` Official diagnosis: ${diagnosis}.` : "";
    const text = resurrected
      ? `I survived the wall 🎆 I'm back from VibeKilled.rip — come watch ${down} devs who are still down:`
      : `I just got VibeKilled 💀${dx} ${down} devs are down right now. Misery loves company — see who else hit the wall:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "VibeKilled.rip — Dev Down Detector", text, url });
        return;
      } catch {
        /* user cancelled or unsupported — fall through */
      }
    }
    if (typeof window !== "undefined") {
      const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(intent, "_blank", "noopener,noreferrer");
      toast({ tone: "info", emoji: "📣", title: "Opening share…", body: "Spread the misery (with love)." });
    }
  }

  return (
    <button
      onClick={share}
      className={`rounded-xl bg-electric/15 px-3 py-2.5 text-xs font-bold text-electric transition hover:bg-electric/25 ${className}`}
    >
      📣 {resurrected ? "Share your comeback" : "Share your demise"}
    </button>
  );
}
