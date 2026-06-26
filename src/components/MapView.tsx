"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
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

function makeIcon(pin: Pin): L.DivIcon {
  const meta = provider(pin.provider);
  const glow = pin.resurrected ? "#ffd166" : meta.glow;
  const emoji = pin.resurrected ? "🎆" : "💀";
  const container = `vk-pin${pin.resurrected ? " vk-pin-resurrected" : ""}`;
  const glowCls = `vk-pin-glow${pin.resurrected ? "" : " vk-pin-new"}`;
  return L.divIcon({
    className: container,
    html: `<span class="${glowCls}" style="color:${glow};background:radial-gradient(circle, ${glow}55 0%, transparent 70%)"></span><span class="vk-pin-emoji">${emoji}</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
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
        const t = setTimeout(() => m.openPopup(), 800);
        return () => clearTimeout(t);
      }
      // Marker not mounted yet — let the next `pins` change retry the open.
    }
  }, [focusTarget, pins, map, markerRefs]);

  return null;
}

// Gently drifts the map toward freshly-arrived kills so the world feels alive —
// pan only, never opening a popup (so it can't steal your open card). Disabled
// while you're down: your own campfire is always the boss. Skips the initial
// batch so it only follows pins that land AFTER you're watching.
function AutoFollowController({
  pins,
  enabled,
  myPinId,
}: {
  pins: Pin[];
  enabled: boolean;
  myPinId: string | null;
}) {
  const map = useMap();
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    const markAll = () => pins.forEach((p) => seen.current.add(p.id));
    if (!primed.current) {
      markAll(); // remember what's already here; don't fly to the opening batch
      primed.current = true;
      return;
    }
    if (!enabled) {
      markAll();
      return;
    }
    const fresh = pins.find((p) => p.id !== myPinId && !seen.current.has(p.id));
    markAll();
    if (fresh) {
      // "Just enough": nudge closer if zoomed out, but never zoom back out.
      const zoom = Math.max(map.getZoom(), 4);
      map.flyTo([fresh.lat, fresh.lng], zoom, { duration: 2.2 });
    }
  }, [pins, enabled, myPinId, map]);

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
  globalViewSeq = 0,
  weather = false,
}: {
  pins: Pin[];
  myPinId: string | null;
  focusTarget: FocusTarget | null;
  globalViewSeq?: number;
  weather?: boolean;
}) {
  const markerRefs = useRef(new Map<string, L.Marker>());

  // Stable ref-setter so memoized markers never re-render just to rebind a ref.
  const setMarkerRef = useCallback((id: string, m: L.Marker | null) => {
    if (m) markerRefs.current.set(id, m);
    else markerRefs.current.delete(id);
  }, []);

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

      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} mine={pin.id === myPinId} onRef={setMarkerRef} />
      ))}

      {weather && <WallWeather pins={pins} />}

      <Fireworks pins={pins} />
      <FocusController focusTarget={focusTarget} pins={pins} markerRefs={markerRefs} />
      <AutoFollowController pins={pins} enabled={!myPinId} myPinId={myPinId} />
      <GlobalViewController seq={globalViewSeq} />
    </MapContainer>
  );
}
