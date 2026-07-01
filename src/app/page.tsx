"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePins, usePresence, useStats } from "@/lib/hooks";
import { clearReactions, getMyPin, getName, getUserId, setMyPin, takeFirstVisit } from "@/lib/identity";
import { fetchWhereami } from "@/lib/api";
import { diagnosis } from "@/lib/lore";
import { toast } from "@/lib/toast";
import { PROVIDER_LIST } from "@/lib/providers";
import type { Pin, ProviderId } from "@/lib/types";
import type { FocusTarget, ArriveTarget } from "@/components/MapView";
import { KillButton } from "@/components/KillButton";
import { KillModal } from "@/components/KillModal";
import { DropFlash } from "@/components/DropFlash";
import { LolReads } from "@/components/LolReads";
import { Leaderboard } from "@/components/Leaderboard";
import { LandingNotify } from "@/components/LandingNotify";
import { LiveFeed } from "@/components/LiveFeed";
import { MedalsPanel } from "@/components/MedalsPanel";
import { ProviderFilter } from "@/components/ProviderFilter";
import { ReactionFX } from "@/components/ReactionFX";
import { ReactionNotify } from "@/components/ReactionNotify";
import { SessionPanel } from "@/components/SessionPanel";
import { ShareButton } from "@/components/ShareButton";
import { StatsBar } from "@/components/StatsBar";
import { TabBar } from "@/components/TabBar";
import { SallyBadge } from "@/components/SallyBadge";
import { Toaster } from "@/components/Toaster";

const ALL_PROVIDERS = new Set<ProviderId>(PROVIDER_LIST.map((p) => p.id));
const DEV = process.env.NEXT_PUBLIC_VK_DEV === "1";

// Closest pin to a coordinate (rough planar distance, lng scaled by latitude —
// plenty accurate at city/region scale). Used to land arrivals on a real card.
function nearestPin(pins: Pin[], loc: { lat: number; lng: number }, exceptId?: string | null): Pin | null {
  const cos = Math.cos((loc.lat * Math.PI) / 180);
  let best: Pin | null = null;
  let bestD = Infinity;
  for (const p of pins) {
    if (p.id === exceptId) continue;
    const dLat = p.lat - loc.lat;
    const dLng = (p.lng - loc.lng) * cos;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/30">Loading the graveyard…</div>,
});

type LeftKey = "medals" | "kings";
type MobileKey = "globe" | "kings" | "medals";

export default function Home() {
  const qc = useQueryClient();
  const { data: pins } = usePins();
  const { data: stats } = useStats();
  const online = usePresence();
  const [userId, setUserId] = useState<string | null>(null);
  const [myPinId, setMyPinId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [arrive, setArrive] = useState<ArriveTarget | null>(null);
  const [arriveLoc, setArriveLoc] = useState<{ lat: number; lng: number } | null>(null);
  const arrivedRef = useRef(false);
  const focusSeq = useRef(0);
  // Tracks the newest real kill we've already flown to, so the live map only
  // jumps once per fresh casualty (and never on first load — see below).
  const lastKillSeq = useRef<number | null>(null);
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

  // First-time visitors (no pin of their own) get their coarse area on arrival —
  // the lookup also nudges the server to seed devs near them.
  useEffect(() => {
    if (getMyPin()) return; // your own pin's auto-focus already centers the map
    let alive = true;
    // Seed nearby devs only on a device's first-ever visit — refreshes just
    // re-center the map, they never spawn more bots.
    fetchWhereami(takeFirstVisit()).then((loc) => {
      if (alive && loc) setArriveLoc(loc);
    });
    return () => {
      alive = false;
    };
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

  // Arrival (no pin of your own): once pins are loaded, land right on the nearest
  // dev's card so you can hand out sympathy / Good4U immediately — no hunting.
  // Falls back to a gentle region fly-in if somehow no pins are around yet.
  useEffect(() => {
    if (arrivedRef.current || !arriveLoc) return;
    if (myPinId) {
      arrivedRef.current = true; // your own pin's focus already handles arrival
      return;
    }
    if (!allPins.length) return; // wait for the first batch
    arrivedRef.current = true;
    const near = nearestPin(allPins, arriveLoc, myPinId);
    if (near) focusOn({ id: near.id, lat: near.lat, lng: near.lng });
    else flyToRegion(arriveLoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arriveLoc, allPins, myPinId]);

  // Live "dev down" — when a REAL casualty arrives (ambient never sets this),
  // fly the open map straight to them so watchers see it happen. We baseline the
  // seq on first load (no jump to old kills) and skip our own freshly-dropped pin
  // (the drop flow already centered us).
  useEffect(() => {
    const lk = stats?.lastKill;
    if (!lk) return;
    if (lastKillSeq.current === null) {
      lastKillSeq.current = lk.seq; // first sight → just remember, don't fly
      return;
    }
    if (lk.seq <= lastKillSeq.current) return;
    lastKillSeq.current = lk.seq;
    // Never yank the view away while YOU'RE down — your own card (with the
    // Campfire) must stay open and win. Also skip your own kill / stale ones.
    if (myPinId || Date.now() - lk.at > 30_000) return;
    focusOn({ id: lk.id, lat: lk.lat, lng: lk.lng });
    toast({ tone: "warn", emoji: "💀", title: "A dev just went down", body: "Flying you to the fresh casualty.", ttl: 4000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.lastKill, myPinId]);

  function focusOn(t: { id: string; lat: number; lng: number }) {
    focusSeq.current += 1;
    setFocus({ ...t, n: focusSeq.current });
  }

  function flyToRegion(loc: { lat: number; lng: number }) {
    setArrive({ lat: loc.lat, lng: loc.lng, n: 1 });
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
    // Optimistically drop YOUR pin into the map cache right now. Without this the
    // marker doesn't exist until the next `usePins` poll (up to 4s), so there's
    // nothing for the focus to open — the map drifts but your card never opens.
    // Seeding it means the marker mounts this render, and the focus opens it.
    qc.setQueryData<Pin[]>(["pins"], (old) => {
      const list = old ?? [];
      return list.some((p) => p.id === pin.id) ? list : [pin, ...list];
    });
    // Also seed the single-pin query so the popup's Campfire (useMyPin) has data
    // with zero network wait — the card is fully alive the instant it opens.
    qc.setQueryData(["pin", pin.id], pin);
    // We're focusing on the fresh pin right here, so don't let the on-load
    // auto-focus effect fire a second, redundant fly once the pin streams in.
    didInitFocus.current = true;
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
      <MapView pins={visiblePins} myPinId={myPinId} focusTarget={focus} arriveTarget={arrive} globalViewSeq={globalSeq} weather={weatherOn} />

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
      {/* Backgrounded-tab pings for incoming sympathy / Good4U while you're down.
          Kept at the page root so it survives a collapsed mobile sheet. */}
      {down && <ReactionNotify myPinId={myPinId} />}
      <LandingNotify />
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
