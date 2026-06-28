// Ambient "down devs" — a worldwide floor of believable, faked pins so the map is
// never empty when someone lands. To users these look exactly like ordinary
// anonymous developers behind the wall; internally each is flagged `ambient` so
// it never touches real analytics (leaderboard, admin journey, kill counters).
//
// This module is PURE DATA + pickers only (no Redis). The store owns all Redis
// ops and reads this to mint pins — see `ensureAmbientPins` in store.ts.

import type { ProviderId } from "./types";

// ── Tunables (configurable data kept high-level) ──────────────────────────────
/** How many ambient devs to keep alive worldwide at all times. */
export const AMBIENT_FLOOR = 45;
/** Min seconds between top-up reconciles (a Redis lock collapses the poll flood). */
export const AMBIENT_RECONCILE_SEC = 25;
/** Chance an ambient kill also drops a feed event (kept low so real events lead). */
export const AMBIENT_KILL_FEED_P = 0.25;
/** Chance an ambient resurrection pushes a feed event (rarer → celebratory). */
export const AMBIENT_RESURRECT_FEED_P = 0.55;
/** Max feed events to emit per reconcile, so a big back-fill never floods. */
export const AMBIENT_FEED_PER_RUN = 6;
/** Recovery window range (minutes) — short-ish so churn is visible in a session. */
export const AMBIENT_MIN_MINUTES = 20;
export const AMBIENT_MAX_MINUTES = 200;

// ── Local seeding (drops near each fresh visitor) ─────────────────────────────
/** How many faked devs to drop near a visitor's own area on arrival. */
export const LOCAL_MIN = 2;
export const LOCAL_MAX = 4;
/** Distance band from the visitor (km). Kept tight so it reads as "near me".
 *  Coarse jitter (~12km) is added on top, so effective spread stays within ~50km. */
export const LOCAL_MIN_KM = 5;
export const LOCAL_MAX_KM = 40;
/** One seeding per ~111km cell per window, so a busy region doesn't pile up. */
export const LOCAL_RECONCILE_SEC = 600;
/** Hard global ceiling on local pins — bounds total growth no matter how many
 *  distinct visitor regions (or bots/crawlers) trigger seeding. */
export const LOCAL_CAP = 35;
/** Max local feed events per run (a couple "fresh nearby hit" lines). */
export const LOCAL_FEED_PER_RUN = 2;

// ── Worldwide dev cities (with ISO country for the flag) ──────────────────────
// Spread across every continent so the faked activity reads as truly global.
export interface AmbientCity {
  lat: number;
  lng: number;
  cc: string;
}

export const AMBIENT_CITIES: AmbientCity[] = [
  // North America
  { lat: 37.77, lng: -122.42, cc: "US" }, // San Francisco
  { lat: 40.71, lng: -74.01, cc: "US" }, // New York
  { lat: 47.61, lng: -122.33, cc: "US" }, // Seattle
  { lat: 30.27, lng: -97.74, cc: "US" }, // Austin
  { lat: 41.88, lng: -87.63, cc: "US" }, // Chicago
  { lat: 43.65, lng: -79.38, cc: "CA" }, // Toronto
  { lat: 49.28, lng: -123.12, cc: "CA" }, // Vancouver
  { lat: 19.43, lng: -99.13, cc: "MX" }, // Mexico City
  // South America
  { lat: -23.55, lng: -46.63, cc: "BR" }, // São Paulo
  { lat: -34.6, lng: -58.38, cc: "AR" }, // Buenos Aires
  { lat: 4.71, lng: -74.07, cc: "CO" }, // Bogotá
  { lat: -33.45, lng: -70.67, cc: "CL" }, // Santiago
  // Europe
  { lat: 51.51, lng: -0.13, cc: "GB" }, // London
  { lat: 53.35, lng: -6.26, cc: "IE" }, // Dublin
  { lat: 52.37, lng: 4.9, cc: "NL" }, // Amsterdam
  { lat: 52.52, lng: 13.4, cc: "DE" }, // Berlin
  { lat: 48.86, lng: 2.35, cc: "FR" }, // Paris
  { lat: 40.42, lng: -3.7, cc: "ES" }, // Madrid
  { lat: 41.39, lng: 2.17, cc: "ES" }, // Barcelona
  { lat: 45.46, lng: 9.19, cc: "IT" }, // Milan
  { lat: 59.33, lng: 18.07, cc: "SE" }, // Stockholm
  { lat: 52.23, lng: 21.01, cc: "PL" }, // Warsaw
  { lat: 50.08, lng: 14.44, cc: "CZ" }, // Prague
  { lat: 47.5, lng: 19.04, cc: "HU" }, // Budapest
  { lat: 38.72, lng: -9.14, cc: "PT" }, // Lisbon
  { lat: 60.17, lng: 24.94, cc: "FI" }, // Helsinki
  // Middle East + Africa
  { lat: 32.08, lng: 34.78, cc: "IL" }, // Tel Aviv
  { lat: 25.2, lng: 55.27, cc: "AE" }, // Dubai
  { lat: 41.01, lng: 28.98, cc: "TR" }, // Istanbul
  { lat: 6.52, lng: 3.38, cc: "NG" }, // Lagos
  { lat: -1.29, lng: 36.82, cc: "KE" }, // Nairobi
  { lat: 30.04, lng: 31.24, cc: "EG" }, // Cairo
  { lat: -33.92, lng: 18.42, cc: "ZA" }, // Cape Town
  // Asia
  { lat: 12.97, lng: 77.59, cc: "IN" }, // Bangalore
  { lat: 19.08, lng: 72.88, cc: "IN" }, // Mumbai
  { lat: 28.61, lng: 77.21, cc: "IN" }, // Delhi
  { lat: 1.35, lng: 103.82, cc: "SG" }, // Singapore
  { lat: 35.68, lng: 139.69, cc: "JP" }, // Tokyo
  { lat: 37.57, lng: 126.98, cc: "KR" }, // Seoul
  { lat: 31.23, lng: 121.47, cc: "CN" }, // Shanghai
  { lat: 22.32, lng: 114.17, cc: "HK" }, // Hong Kong
  { lat: -6.21, lng: 106.85, cc: "ID" }, // Jakarta
  { lat: 13.76, lng: 100.5, cc: "TH" }, // Bangkok
  { lat: 14.6, lng: 120.98, cc: "PH" }, // Manila
  // Oceania
  { lat: -33.87, lng: 151.21, cc: "AU" }, // Sydney
  { lat: -37.81, lng: 144.96, cc: "AU" }, // Melbourne
  { lat: -36.85, lng: 174.76, cc: "NZ" }, // Auckland
];

// Weighted provider pool — Claude/GPT lead, "other" is rare so personas blend in.
const AMBIENT_PROVIDERS: ProviderId[] = [
  "claude", "claude", "claude", "gpt", "gpt", "gemini", "gemini", "cursor", "other",
];

// Relatable "last words" — separate from the campfire chatter pool.
const AMBIENT_MESSAGES = [
  "mid-refactor, of course",
  "it was working five minutes ago",
  "429'd into oblivion",
  "so close to green CI",
  "ran out of tokens mid-thought",
  "the wall got me again",
  "right before the demo, naturally",
  "one more prompt, I swear",
  "context window said no",
  "rate-limited on a Friday, classic",
  "halfway through the migration",
  "my agent ghosted me",
  "quota gods demanded tribute",
  "thought I had it this time",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function pickCity(): AmbientCity {
  return pick(AMBIENT_CITIES);
}

export function pickAmbientProvider(): ProviderId {
  return pick(AMBIENT_PROVIDERS);
}

export function ambientMessage(): string {
  return pick(AMBIENT_MESSAGES);
}
