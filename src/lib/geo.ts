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
