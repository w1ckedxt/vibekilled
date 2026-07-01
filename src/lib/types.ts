// Shared domain types for VibeKilled.rip — the Dev Down Detector.

export type ProviderId = "claude" | "gemini" | "gpt" | "cursor" | "other";

export interface Pin {
  id: string;
  provider: ProviderId;
  /** Jittered, rounded coordinates — never an exact location (privacy by design). */
  lat: number;
  lng: number;
  /** ms epoch when the kill was logged. */
  createdAt: number;
  /** ms epoch when the provider is estimated to resurrect. */
  recoverAt: number;
  /** Random developer alias, e.g. "Sleepless Goose". */
  name: string;
  message?: string;
  /** ISO country code (e.g. "NL") for the flag — coarse, never precise. */
  country?: string;
  good4u: number;
  sympathy: number;
  views: number;
  /** "I hear you" handshakes from the feed. */
  handshake: number;
  /** True once recoverAt has passed and the resurrection has been celebrated. */
  resurrected: boolean;
  /** Whether the pin's owner is currently present in a browser tab. */
  online?: boolean;
}

export type FeedEventType = "kill" | "resurrection" | "good4u" | "sympathy" | "handshake";

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  name: string;
  provider: ProviderId;
  /** Coarse, human place label like "somewhere in Germany" — never precise. */
  place: string;
  at: number;
  /** Pin this event belongs to → lets the feed send a 🤝 back. */
  pinId?: string;
  /** The downed dev's last words (moderated, kill events only). */
  message?: string;
  /** ISO country code for the flag (the subject of the event). */
  country?: string;
  /** ISO country code of who triggered a reaction (good4u/sympathy/handshake),
   *  so the feed can show "🇳🇱 → 🇧🇷". Coarse, never precise. */
  actorCountry?: string;
  /** Global sequential kill number (kill events only) → "Dev Down #42". */
  seq?: number;
  /** Estimated recovery minutes (kill events only) → quip duration. */
  minutes?: number;
}

/** Last REAL dev-down (never ambient), so an open map can fly there live. */
export interface LastKill {
  id: string;
  lat: number;
  lng: number;
  at: number;
  /** The global kill seq — bumps every real kill, so the client flies once. */
  seq: number;
}

export interface GlobalStats {
  kills: number;
  resurrections: number;
  active: number;
  /** Newest real kill (omitted/null until someone real goes down). */
  lastKill?: LastKill | null;
}

export type AdminEventType =
  | "land"
  | "kill"
  | "good4u"
  | "sympathy"
  | "handshake"
  | "resurrection"
  | "tetris";

export interface AdminEvent {
  id: string;
  type: AdminEventType;
  name?: string;
  provider?: ProviderId;
  /** The country the event is ABOUT (the downed dev / receiver of a reaction). */
  country?: string;
  /** For reactions: the country of whoever GAVE it → admin can read "🇳🇱 → 🇧🇷". */
  actorCountry?: string;
  text?: string;
  at: number;
}
