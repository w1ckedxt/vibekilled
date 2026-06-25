"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Pin } from "@/lib/types";
import { provider } from "@/lib/providers";
import { Fireworks } from "./Fireworks";
import { PinPopup } from "./PinPopup";
import { reactPin } from "@/lib/api";

function makeIcon(pin: Pin): L.DivIcon {
  const meta = provider(pin.provider);
  const bg = meta.glow2
    ? `conic-gradient(${meta.glow}, ${meta.glow2}, ${meta.glow})`
    : meta.glow;
  return L.divIcon({
    className: `vk-pin${pin.resurrected ? " vk-pin-resurrected" : ""}`,
    html: `<div class="vk-pin-dot" style="background:${bg};color:${meta.glow};box-shadow:0 0 12px 3px ${meta.glow}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

export default function MapView({ pins, myPinId }: { pins: Pin[]; myPinId: string | null }) {
  // Memoize icons per pin id + state so they don't churn every poll.
  const icons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const p of pins) m.set(`${p.id}:${p.resurrected}`, makeIcon(p));
    return m;
  }, [pins]);

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
        // Free CartoDB "dark matter" raster tiles — no API key required.
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
        subdomains="abcd"
        maxZoom={20}
      />

      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={icons.get(`${pin.id}:${pin.resurrected}`)!}
          eventHandlers={{
            popupopen: () => {
              if (pin.id !== myPinId) reactPin(pin.id, "view").catch(() => {});
            },
          }}
        >
          <Popup>
            <PinPopup pin={pin} isMine={pin.id === myPinId} />
          </Popup>
        </Marker>
      ))}

      <Fireworks pins={pins} />
    </MapContainer>
  );
}
