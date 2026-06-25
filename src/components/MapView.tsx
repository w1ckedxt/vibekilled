"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Pin } from "@/lib/types";
import { provider } from "@/lib/providers";
import { Fireworks } from "./Fireworks";
import { PinPopup } from "./PinPopup";
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

// Flies to a newly-created pin and opens its card automatically.
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

  useEffect(() => {
    if (!focusTarget) return;
    if (flown.current !== focusTarget.n) {
      map.flyTo([focusTarget.lat, focusTarget.lng], 6, { duration: 1.8 });
      flown.current = focusTarget.n;
    }
    const m = markerRefs.current?.get(focusTarget.id);
    if (m) {
      const t = setTimeout(() => m.openPopup(), 800);
      return () => clearTimeout(t);
    }
  }, [focusTarget, pins, map, markerRefs]);

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
}: {
  pins: Pin[];
  myPinId: string | null;
  focusTarget: FocusTarget | null;
  globalViewSeq?: number;
}) {
  // Stable icon cache so markers don't re-animate on every poll.
  const iconCache = useRef(new Map<string, L.DivIcon>());
  const markerRefs = useRef(new Map<string, L.Marker>());

  function iconFor(pin: Pin): L.DivIcon {
    const key = `${pin.id}:${pin.resurrected}`;
    let ic = iconCache.current.get(key);
    if (!ic) {
      ic = makeIcon(pin);
      iconCache.current.set(key, ic);
    }
    return ic;
  }

  return (
    <MapContainer
      center={[25, 10]}
      zoom={3}
      minZoom={2}
      maxZoom={12}
      worldCopyJump
      zoomControl={false}
      attributionControl
      className="absolute inset-0 h-full w-full"
      style={{ background: "#050507" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
        subdomains="abcd"
        maxZoom={20}
      />

      {pins.map((pin) => {
        const mine = pin.id === myPinId;
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={iconFor(pin)}
            ref={(r) => {
              if (r) markerRefs.current.set(pin.id, r);
              else markerRefs.current.delete(pin.id);
            }}
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
      })}

      <Fireworks pins={pins} />
      <FocusController focusTarget={focusTarget} pins={pins} markerRefs={markerRefs} />
      <GlobalViewController seq={globalViewSeq} />
    </MapContainer>
  );
}
