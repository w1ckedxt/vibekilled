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
  /** ISO country code for the flag. */
  country?: string;
  /** Global sequential kill number (kill events only) → "Dev Down #42". */
  seq?: number;
  /** Estimated recovery minutes (kill events only) → quip duration. */
  minutes?: number;
}

export interface GlobalStats {
  kills: number;
  resurrections: number;
  active: number;
}

export interface ChatMessage {
  id: string;
  name: string;
  provider: ProviderId;
  text: string;
  at: number;
  /** Absolute epoch ms when the author's wall timer ends, so the campfire can
   *  show each person's live "time left". Snapshot of their pin at post time. */
  recoverAt?: number;
  /** Internal only — true for ambient bot chatter. Never surfaced to users. */
  bot?: boolean;
}

export type AdminEventType =
  | "land"
  | "kill"
  | "chat"
  | "good4u"
  | "sympathy"
  | "handshake"
  | "resurrection";

export interface AdminEvent {
  id: string;
  type: AdminEventType;
  name?: string;
  provider?: ProviderId;
  country?: string;
  text?: string;
  at: number;
}
