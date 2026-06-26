"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePins, usePresence, useStats } from "@/lib/hooks";
import { clearReactions, getMyPin, getName, getUserId, setMyPin } from "@/lib/identity";
import { diagnosis } from "@/lib/lore";
import { PROVIDER_LIST } from "@/lib/providers";
import type { Pin, ProviderId } from "@/lib/types";
import type { FocusTarget } from "@/components/MapView";
import { KillButton } from "@/components/KillButton";
import { KillModal } from "@/components/KillModal";
import { DropFlash } from "@/components/DropFlash";
import { LolReads } from "@/components/LolReads";
import { Leaderboard } from "@/components/Leaderboard";
import { LiveFeed } from "@/components/LiveFeed";
import { MedalsPanel } from "@/components/MedalsPanel";
import { ProviderFilter } from "@/components/ProviderFilter";
import { ReactionFX } from "@/components/ReactionFX";
import { SessionPanel } from "@/components/SessionPanel";
import { ShareButton } from "@/components/ShareButton";
import { StatsBar } from "@/components/StatsBar";
import { TabBar } from "@/components/TabBar";
import { SallyBadge } from "@/components/SallyBadge";
import { Toaster } from "@/components/Toaster";

const ALL_PROVIDERS = new Set<ProviderId>(PROVIDER_LIST.map((p) => p.id));
const DEV = process.env.NEXT_PUBLIC_VK_DEV === "1";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/30">Loading the graveyard…</div>,
});

type LeftKey = "medals" | "kings";
type MobileKey = "globe" | "kings" | "medals";

export default function Home() {
  const { data: pins } = usePins();
  const online = usePresence();
  const [userId, setUserId] = useState<string | null>(null);
  const [myPinId, setMyPinId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const focusSeq = useRef(0);
  const [enabled, setEnabled] = useState<Set<ProviderId>>(() => new Set(ALL_PROVIDERS));
  const [leftTab, setLeftTab] = useState<LeftKey>("medals");
  const [mobileTab, setMobileTab] = useState<MobileKey>("globe");
  const [globalSeq, setGlobalSeq] = useState(0);
  // Mobile panels start collapsed so the big "I've been hit" CTA is the first
  // thing in reach — the map + button shouldn't be buried under feeds.
  const [sheetOpen, setSheetOpen] = useState(false);
  // Tap the ✕ to stash the big CTA and roam the map; a compact pill brings it back.
  const [ctaDismissed, setCtaDismissed] = useState(false);
  // Bumped on every kill so the DROPPED celebration replays (with a diagnosis).
  const [drop, setDrop] = useState<{ seq: number; dx: string }>({ seq: 0, dx: "" });
  // Satirical "Wall Weather" storm overlay toggle.
  const [weatherOn, setWeatherOn] = useState(false);
  const didInitFocus = useRef(false);

  useEffect(() => {
    setMyPinId(getMyPin());
    setUserId(getUserId());
  }, []);

  const allPins = pins ?? [];
  const visiblePins = useMemo(() => allPins.filter((p) => enabled.has(p.provider)), [allPins, enabled]);
  const down = Boolean(myPinId);
  const myPin = allPins.find((p) => p.id === myPinId);
  const myResurrected = Boolean(myPin?.resurrected);

  // On load, fly to your own pin so the map opens on YOUR area.
  useEffect(() => {
    if (didInitFocus.current || !myPinId || !myPin) return;
    didInitFocus.current = true;
    focusOn({ id: myPin.id, lat: myPin.lat, lng: myPin.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPinId, myPin]);

  function focusOn(t: { id: string; lat: number; lng: number }) {
    focusSeq.current += 1;
    setFocus({ ...t, n: focusSeq.current });
  }

  function toggleProvider(id: ProviderId) {
    setEnabled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next.size === 0 ? new Set(ALL_PROVIDERS) : next;
    });
  }

  function clearMine() {
    setMyPin(null);
    setMyPinId(null);
  }

  function devReset() {
    clearMine();
    clearReactions(); // so you can hand out sympathy / Good4U again while testing
  }

  function onCreated(pin: Pin) {
    setMyPinId(pin.id);
    setDrop((d) => ({ seq: d.seq + 1, dx: diagnosis(pin.id) })); // fire the DROPPED celebration
    focusOn({ id: pin.id, lat: pin.lat, lng: pin.lng });
  }

  // Your status card. The Campfire itself lives on your pin's card on the map.
  const myCard = (
    <SessionPanel
      myPinId={myPinId!}
      onClear={clearMine}
      onLogAnother={() => {
        clearMine();
        setModalOpen(true);
      }}
    />
  );

  function leftPanel() {
    return leftTab === "kings" ? <Leaderboard /> : <MedalsPanel userId={userId} />;
  }
  function mobilePanel() {
    if (mobileTab === "kings") return <Leaderboard />;
    if (mobileTab === "medals") return <MedalsPanel userId={userId} />;
    return <LiveFeed myPinId={myPinId} onFocus={focusOn} />;
  }

  return (
    <main className="relative h-full w-full overflow-hidden">
      <MapView pins={visiblePins} myPinId={myPinId} focusTarget={focus} globalViewSeq={globalSeq} weather={weatherOn} />

      <div className="pointer-events-none absolute inset-0 z-[600]">
        {/* Header */}
        <div className="absolute left-3 top-3">
          <h1 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-white sm:gap-2 sm:text-3xl">
            <span aria-hidden>💀</span>
            VibeKilled<span className="text-coral">.rip</span>
            <span className="vk-caret hidden font-mono text-electric sm:inline">▍</span>
          </h1>
          <div className="hidden sm:block">
            <p className="font-mono text-xs text-white/45">
              <span className="text-electric">&gt;</span> dev-down-detector
            </p>
            <SallyBadge />
          </div>
        </div>

        {/* Stats pill */}
        <div className="absolute right-3 top-3">
          <StatsBar online={online} />
        </div>

        {/* Provider filter */}
        <div className="absolute left-1/2 top-20 -translate-x-1/2 sm:top-3">
          <ProviderFilter pins={allPins} enabled={enabled} onToggle={toggleProvider} />
        </div>

        {/* LEFT column (desktop): Glory — Medals / Vibe Kings */}
        <div className="absolute left-3 top-24 hidden w-[340px] flex-col gap-2 lg:flex">
          <TabBar
            tabs={[{ key: "medals", label: "🏅 Medals" }, { key: "kings", label: "👑 Vibe Kings" }]}
            active={leftTab}
            onChange={setLeftTab}
          />
          {leftPanel()}
        </div>

        {/* RIGHT column (desktop): your card+campfire (or intro) + Globe of Pain */}
        <div className="absolute right-3 top-24 hidden w-[360px] flex-col gap-2 lg:flex">
          {down ? myCard : <IntroCard online={online} />}
          <LiveFeed myPinId={myPinId} onFocus={focusOn} />
        </div>

        {/* MOBILE bottom sheet — collapsible so the map stays usable */}
        <div className="absolute inset-x-3 bottom-24 flex flex-col gap-2 lg:hidden">
          <button
            onClick={() => setSheetOpen((o) => !o)}
            className="glass pointer-events-auto self-center rounded-full px-4 py-1.5 text-xs font-semibold text-white/70"
          >
            {sheetOpen ? "▼ hide panels" : "▲ show panels"}
          </button>
          {sheetOpen && (
            <div className="vk-scroll flex max-h-[66vh] flex-col gap-2 overflow-y-auto">
              {down ? myCard : <IntroCard online={online} />}
              <TabBar
                tabs={[
                  { key: "globe", label: "🌍" },
                  { key: "kings", label: "👑" },
                  { key: "medals", label: "🏅" },
                ]}
                active={mobileTab}
                onChange={setMobileTab}
              />
              {mobilePanel()}
            </div>
          )}
        </div>

        {/* Kill CTA — big & dead-center, or a compact pill once you tap it away.
            Hidden only while your own timer is still running. */}
        {(!down || myResurrected) &&
          (ctaDismissed ? (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <KillButton variant="compact" onClick={() => setModalOpen(true)} />
            </div>
          ) : (
            // Mobile: dead-center. Desktop: down at the bottom of the map.
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:bottom-8 sm:translate-y-0">
              <KillButton onClick={() => setModalOpen(true)} onDismiss={() => setCtaDismissed(true)} />
            </div>
          ))}

        {/* Map controls — one tidy segmented card */}
        <div className="glass pointer-events-auto absolute bottom-6 right-3 flex w-[136px] flex-col divide-y divide-white/8 overflow-hidden rounded-2xl text-[12px] font-semibold">
          <button
            onClick={() => setWeatherOn((w) => !w)}
            className={`px-3.5 py-2 text-right transition ${
              weatherOn ? "bg-electric/10 text-electric" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            🌦️ Weather
          </button>
          {down && myPin && (
            <button
              onClick={() => focusOn({ id: myPin.id, lat: myPin.lat, lng: myPin.lng })}
              className="px-3.5 py-2 text-right text-ember transition hover:bg-white/5"
            >
              🔥 My fire
            </button>
          )}
          <button
            onClick={() => setGlobalSeq((s) => s + 1)}
            className="px-3.5 py-2 text-right text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            🌍 Global
          </button>
        </div>

        {/* Bottom-left: dev reset (Sally moved under the header) */}
        {DEV && (
          <button
            onClick={devReset}
            className="pointer-events-auto absolute bottom-4 left-4 hidden rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 font-mono text-xs text-white/60 hover:text-white lg:block"
          >
            🛠 dev: reset me
          </button>
        )}
      </div>

      <KillModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={onCreated} />
      <DropFlash seq={drop.seq} diagnosis={drop.dx} />
      <ReactionFX />
      <Toaster />
    </main>
  );
}

function IntroCard({ online }: { online: number }) {
  const { data } = useStats();
  const downNow = data?.active ?? 0;
  const [name, setNameLocal] = useState("");
  useEffect(() => setNameLocal(getName()), []);

  return (
    <>
    <div className="glass pointer-events-auto rounded-2xl p-4">
      {name && (
        <p className="mb-2 text-sm text-white/70">
          👋 oh look, it&apos;s <span className="font-bold text-electric">{name}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-coral" />
        <span className="text-base font-bold text-white">
          <span className="text-coral">{downNow.toLocaleString()}</span> dev{downNow === 1 ? "" : "s"} down ·{" "}
          <span className="text-emerald-400">{online}</span> watching
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-white/60">
        Hit a wall? Log it, watch the world resurrect, and let strangers feel your pain. No accounts. Locations are
        always estimated.
      </p>
      <ShareButton className="mt-3 w-full" />
    </div>
    <LolReads />
    </>
  );
}
