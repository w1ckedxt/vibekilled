// Privacy-first geo helpers. We NEVER store or show an exact location — every
// coordinate is jittered and rounded, and we only ever label places coarsely
// (country-level). This is an estimation, by design.

/** ~ up to this many km of random jitter added to every coordinate. */
const JITTER_KM = 12;
/** Round to ~1.1km grid so two nearby people can't be triangulated. */
const COORD_PRECISION = 2;

const KM_PER_DEG_LAT = 111;

function jitterOne(value: number, km: number): number {
  const deg = km / KM_PER_DEG_LAT;
  return value + (Math.random() * 2 - 1) * deg;
}

/** A random point a given distance band (km) away from an origin, in a random
 *  direction. Used to scatter ambient devs *near* a visitor without ever landing
 *  on their exact spot. Result is meant to be passed through `obfuscate` after. */
export function nearbyPoint(
  lat: number,
  lng: number,
  minKm: number,
  maxKm: number,
): { lat: number; lng: number } {
  const dist = minKm + Math.random() * (maxKm - minKm);
  const bearing = Math.random() * Math.PI * 2;
  const lngScale = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + (dist / KM_PER_DEG_LAT) * Math.cos(bearing),
    lng: lng + (dist / (KM_PER_DEG_LAT * lngScale)) * Math.sin(bearing),
  };
}

/** Apply random jitter + coarse rounding to a coordinate pair. */
export function obfuscate(lat: number, lng: number): { lat: number; lng: number } {
  const j = JITTER_KM * Math.random();
  const lngScale = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const jLat = jitterOne(lat, j);
  const jLng = jitterOne(lng, j / lngScale);
  return {
    lat: Number(jLat.toFixed(COORD_PRECISION)),
    lng: Number(jLng.toFixed(COORD_PRECISION)),
  };
}

let regionNames: Intl.DisplayNames | null = null;
function countryName(code?: string | null): string | null {
  if (!code) return null;
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code.toUpperCase()) ?? null;
  } catch {
    return code;
  }
}

/** Coarse, friendly place label like "somewhere in Germany". */
export function placeLabel(countryCode?: string | null): string {
  const name = countryName(countryCode);
  return name ? `somewhere in ${name}` : "somewhere out there";
}

// Major developer hubs — used as a sensible fallback when we have no location
// at all, so nobody ends up floating in the middle of the ocean.
const HUBS: Array<[number, number]> = [
  [37.77, -122.42], // San Francisco
  [40.71, -74.01], // New York
  [30.27, -97.74], // Austin
  [43.65, -79.38], // Toronto
  [51.51, -0.13], // London
  [52.37, 4.9], // Amsterdam
  [52.52, 13.4], // Berlin
  [48.86, 2.35], // Paris
  [59.33, 18.07], // Stockholm
  [53.35, -6.26], // Dublin
  [52.23, 21.01], // Warsaw
  [40.42, -3.7], // Madrid
  [32.08, 34.78], // Tel Aviv
  [12.97, 77.59], // Bangalore
  [1.35, 103.82], // Singapore
  [35.68, 139.69], // Tokyo
  [37.57, 126.98], // Seoul
  [-6.21, 106.85], // Jakarta
  [-33.87, 151.21], // Sydney
  [-23.55, -46.63], // São Paulo
  [19.43, -99.13], // Mexico City
  [6.52, 3.38], // Lagos
];

/**
 * A dev-hub city to fall back to when we have no location at all. Keyed by a
 * seed (the userId) so the same person always lands in the SAME city instead of
 * teleporting between drops. Keeps pins on land.
 */
export function hubForSeed(seed?: string): { lat: number; lng: number } {
  let idx: number;
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    idx = Math.abs(h) % HUBS.length;
  } else {
    idx = Math.floor(Math.random() * HUBS.length);
  }
  const [lat, lng] = HUBS[idx];
  return { lat, lng };
}

/** ISO country code → flag emoji (e.g. "NL" → 🇳🇱). Empty string if unknown. */
export function flagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const cc = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
