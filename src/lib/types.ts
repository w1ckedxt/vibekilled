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
  good4u: number;
  sympathy: number;
  views: number;
  /** True once recoverAt has passed and the resurrection has been celebrated. */
  resurrected: boolean;
}

export type FeedEventType = "kill" | "resurrection" | "good4u" | "sympathy";

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  name: string;
  provider: ProviderId;
  /** Coarse, human place label like "somewhere in Germany" — never precise. */
  place: string;
  at: number;
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
