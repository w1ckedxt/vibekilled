"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePins } from "@/lib/hooks";
import { getMyPin, setMyPin } from "@/lib/identity";
import { KillButton } from "@/components/KillButton";
import { KillModal } from "@/components/KillModal";
import { LiveFeed } from "@/components/LiveFeed";
import { SessionPanel } from "@/components/SessionPanel";
import { StatsBar } from "@/components/StatsBar";
import { Toaster } from "@/components/Toaster";

// Leaflet touches `window`, so the map is client-only.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/30">Loading the graveyard…</div>,
});

export default function Home() {
  const { data: pins } = usePins();
  const [myPinId, setMyPinId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setMyPinId(getMyPin());
  }, []);

  function clearMine() {
    setMyPin(null);
    setMyPinId(null);
  }

  return (
    <main className="relative h-full w-full overflow-hidden">
      <MapView pins={pins ?? []} myPinId={myPinId} />

      {/* Overlay layer — transparent to map clicks except on panels */}
      <div className="pointer-events-none absolute inset-0 z-[600]">
        {/* Header */}
        <div className="absolute left-3 top-3">
          <h1 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-white">
            <span aria-hidden>💀</span>
            VibeKilled<span className="text-coral">.rip</span>
            <span className="vk-caret font-mono text-electric">▍</span>
          </h1>
          <p className="hidden font-mono text-[11px] text-white/40 sm:block">
            <span className="text-electric">&gt;</span> dev-down-detector
          </p>
        </div>

        {/* Stats pill */}
        <div className="absolute right-3 top-3">
          <StatsBar />
        </div>

        {/* Side panel (desktop right column / mobile bottom sheet) */}
        <div className="absolute inset-x-3 bottom-24 flex flex-col gap-2.5 sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-20 sm:w-[330px]">
          {myPinId ? (
            <SessionPanel
              myPinId={myPinId}
              onClear={clearMine}
              onLogAnother={() => {
                clearMine();
                setModalOpen(true);
              }}
            />
          ) : (
            <IntroCard />
          )}
          <LiveFeed />
        </div>

        {/* Kill button — hidden while you're already down */}
        {!myPinId && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <KillButton onClick={() => setModalOpen(true)} />
          </div>
        )}
      </div>

      <KillModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={setMyPinId} />
      <Toaster />
    </main>
  );
}

function IntroCard() {
  return (
    <div className="glass pointer-events-auto rounded-2xl p-4">
      <p className="text-sm font-semibold text-white">Hit a wall? You&apos;re not alone. 🪦</p>
      <p className="mt-1 text-xs text-white/55">
        Log your rate-limit, watch the world resurrect, and let strangers feel your pain. No accounts. Locations are
        always estimated.
      </p>
    </div>
  );
}
