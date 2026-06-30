"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Pin } from "@/lib/types";
import { provider } from "@/lib/providers";
import { Fireworks } from "./Fireworks";
import { PinPopup } from "./PinPopup";
import { WallWeather } from "./WallWeather";
import { reactPin } from "@/lib/api";

export interface FocusTarget {
  id: string;
  lat: number;
  lng: number;
  /** Bumped on every focus request so re-clicking the same pin re-flies. */
  n: number;
}

export interface ArriveTarget {
  lat: number;
  lng: number;
  /** Bumped once to trigger the one-time arrival fly-in. */
  n: number;
}

// How recently a kill / resurrection counts as "fresh" — only fresh pins get the
// drop-in + a brief (finite) attention ring. Everything else renders as a static
// halo, so thousands of idle pins on screen cost zero animation.
const FRESH_KILL_MS = 15_000;
const FRESH_RISE_MS = 30_000;

function makeIcon(pin: Pin): L.DivIcon {
  const meta = provider(pin.provider);
  const glow = pin.resurrected ? "#ffd166" : meta.glow;
  const emoji = pin.resurrected ? "🎆" : "💀";
  const now = Date.now();
  const freshKill = !pin.resurrected && now - pin.createdAt < FRESH_KILL_MS;
  const freshRise = pin.resurrected && now - pin.recoverAt < FRESH_RISE_MS;
  const container = `vk-pin${pin.resurrected ? " vk-pin-resurrected" : ""}`;
  // Pulse ring only on fresh kills/resurrections (self-stopping); drop-in only on
  // a fresh kill. Backdated ambient devs are never "fresh", so they arrive calm.
  const glowCls =
    "vk-pin-glow" + (freshKill || freshRise ? " vk-pin-pulse" : "") + (freshKill ? " vk-pin-new" : "");
  return L.divIcon({
    className: container,
    html: `<span class="${glowCls}" style="color:${glow};background:radial-gradient(circle, ${glow}55 0%, transparent 70%)"></span><span class="vk-pin-emoji">${emoji}</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

// Render only what's in view, capped, so the DOM never holds thousands of markers
// at once. Your own pin and any focused pin are always kept (their cards must work).
const RENDER_CAP = 400;

function cullPins(
  pins: Pin[],
  bounds: L.LatLngBounds | null,
  myPinId: string | null,
  focusId: string | null,
): Pin[] {
  let arr = bounds ? pins.filter((p) => bounds.contains([p.lat, p.lng])) : pins;
  if (arr.length > RENDER_CAP) arr = arr.slice(0, RENDER_CAP); // pins arrive newest-first
  const ids = new Set(arr.map((p) => p.id));
  for (const must of [myPinId, focusId]) {
    if (must && !ids.has(must)) {
      const p = pins.find((x) => x.id === must);
      if (p) {
        arr = [...arr, p];
        ids.add(must);
      }
    }
  }
  return arr;
}

// One marker. Memoized so an unchanged pin never re-renders on a poll — that's
// what stops the whole map from flickering/"refreshing" every few seconds.
const PinMarker = memo(function PinMarker({
  pin,
  mine,
  onRef,
}: {
  pin: Pin;
  mine: boolean;
  onRef: (id: string, m: L.Marker | null) => void;
}) {
  // Icon is stable unless the pin's look actually changes (death ↔ resurrection),
  // so reactions/presence updates never re-trigger the spawn glow animation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const icon = useMemo(() => makeIcon(pin), [pin.provider, pin.resurrected]);
  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      ref={(r) => onRef(pin.id, r)}
      eventHandlers={{
        popupopen: () => {
          if (!mine) reactPin(pin.id, "view").catch(() => {});
        },
      }}
    >
      {/* Your own card stays open and is wide enough to host the Campfire. */}
      <Popup
        autoClose={!mine}
        closeOnClick={!mine}
        maxWidth={mine ? 340 : 300}
        minWidth={mine ? 300 : 0}
        className={mine ? "vk-mypopup" : undefined}
      >
        <PinPopup pin={pin} isMine={mine} />
      </Popup>
    </Marker>
  );
});

// Flies to a focused pin and opens its card — but only ONCE per request. Without
// the `opened` guard this effect (which re-runs on every poll via `pins`) would
// re-open the popup every few seconds, and the popup's autoPan would yank the
// map around. That repeated reopen was the "map moves randomly" glitch.
function FocusController({
  focusTarget,
  pins,
  markerRefs,
}: {
  focusTarget: FocusTarget | null;
  pins: Pin[];
  markerRefs: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  const flown = useRef<number>(-1);
  const opened = useRef<number>(-1);

  useEffect(() => {
    if (!focusTarget) return;
    if (flown.current !== focusTarget.n) {
      map.flyTo([focusTarget.lat, focusTarget.lng], 6, { duration: 1.8 });
      flown.current = focusTarget.n;
    }
    if (opened.current !== focusTarget.n) {
      const m = markerRefs.current?.get(focusTarget.id);
      if (m) {
        opened.current = focusTarget.n;
        // Close whatever card was open first (e.g. the arrival "nearest dev"
        // card, or a fresh-casualty fly-in) so the focused pin's popup is the
        // ONLY one left — your own card can't lose to a stray open popup.
        const t = setTimeout(() => {
          map.closePopup();
          m.openPopup();
        }, 800);
        return () => clearTimeout(t);
      }
      // Marker not mounted yet — let the next `pins` change retry the open.
    }
  }, [focusTarget, pins, map, markerRefs]);

  return null;
}

// (Auto-follow removed: now that ambient devs keep the map populated, a controller
// that flew to every freshly-seen pin chased the view around every few seconds and
// made the map unusable. A lively, stable map is the better trade.)

// On arrival, eases the map to the visitor's own region (from coarse IP geo) so
// they open on a populated neighbourhood instead of the whole globe. One-time;
// only used when you don't have your own pin to fly to.
function ArriveController({ arriveAt }: { arriveAt: ArriveTarget | null }) {
  const map = useMap();
  const flown = useRef(-1);
  useEffect(() => {
    if (!arriveAt || flown.current === arriveAt.n) return;
    flown.current = arriveAt.n;
    map.flyTo([arriveAt.lat, arriveAt.lng], 5, { duration: 1.8 });
  }, [arriveAt, map]);
  return null;
}

// Reports the visible bounds up so the parent can render only on-screen markers.
function BoundsTracker({ onChange }: { onChange: (b: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
  });
  return null;
}

// Jumps back out to the whole world when the user hits "Global View".
function GlobalViewController({ seq }: { seq: number }) {
  const map = useMap();
  const last = useRef(0);
  useEffect(() => {
    if (seq > 0 && seq !== last.current) {
      last.current = seq;
      map.flyTo([20, 10], 3, { duration: 1.6 });
    }
  }, [seq, map]);
  return null;
}

export default function MapView({
  pins,
  myPinId,
  focusTarget,
  arriveTarget = null,
  globalViewSeq = 0,
  weather = false,
}: {
  pins: Pin[];
  myPinId: string | null;
  focusTarget: FocusTarget | null;
  arriveTarget?: ArriveTarget | null;
  globalViewSeq?: number;
  weather?: boolean;
}) {
  const markerRefs = useRef(new Map<string, L.Marker>());
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  // Stable ref-setter so memoized markers never re-render just to rebind a ref.
  const setMarkerRef = useCallback((id: string, m: L.Marker | null) => {
    if (m) markerRefs.current.set(id, m);
    else markerRefs.current.delete(id);
  }, []);

  // Only mount markers that are actually on screen (capped) — keeps the DOM light
  // even with thousands of pins live. Weather/Fireworks still see every pin.
  const rendered = useMemo(
    () => cullPins(pins, bounds, myPinId, focusTarget?.id ?? null),
    [pins, bounds, myPinId, focusTarget],
  );

  return (
    <MapContainer
      center={[25, 10]}
      zoom={3}
      // minZoom 3 keeps one world wide enough to fill the viewport, so you can
      // never zoom out far enough to see the map tiled side-by-side.
      minZoom={3}
      maxZoom={12}
      // One bounded world — pan/zoom freely inside, but no endless wrapping.
      // Infinite wrap let Leaflet jump the view a whole world over to chase a
      // popup, which fed the "map moves randomly" glitch. Hard edges fix that.
      maxBounds={[
        [-85, -180],
        [85, 180],
      ]}
      maxBoundsViscosity={1}
      zoomControl={false}
      attributionControl
      className="absolute inset-0 h-full w-full"
      style={{ background: "#050507" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
        subdomains="abcd"
        noWrap
        maxZoom={20}
      />

      {rendered.map((pin) => (
        <PinMarker key={pin.id} pin={pin} mine={pin.id === myPinId} onRef={setMarkerRef} />
      ))}

      {weather && <WallWeather pins={pins} />}

      <Fireworks pins={pins} />
      <BoundsTracker onChange={setBounds} />
      <FocusController focusTarget={focusTarget} pins={pins} markerRefs={markerRefs} />
      <ArriveController arriveAt={arriveTarget} />
      <GlobalViewController seq={globalViewSeq} />
    </MapContainer>
  );
}
