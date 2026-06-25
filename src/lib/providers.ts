import type { ProviderId } from "./types";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  /** Core glow / accent color on the map. */
  glow: string;
  /** Optional secondary color for multi-color glows (Gemini). */
  glow2?: string;
  short: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  claude: { id: "claude", label: "Claude", glow: "#d97757", short: "C" },
  gemini: { id: "gemini", label: "Gemini", glow: "#4285f4", glow2: "#ea4335", short: "G" },
  gpt: { id: "gpt", label: "GPT", glow: "#10a37f", short: "O" },
  cursor: { id: "cursor", label: "Cursor", glow: "#f5f5f5", short: "▮" },
  other: { id: "other", label: "Other", glow: "#e5e5e5", short: "?" },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export function provider(id: string): ProviderMeta {
  return PROVIDERS[id as ProviderId] ?? PROVIDERS.other;
}

// The real agents a dev could be using — "other" is the catch-all, never picked
// for a staged persona so admin chatter blends in with normal users.
const REAL_PROVIDERS: ProviderId[] = ["claude", "gemini", "gpt", "cursor"];

/** Stable provider pick for a name, so a campfire persona keeps one accent color
 *  across all its messages instead of flickering between agents. */
export function providerForName(name: string): ProviderId {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return REAL_PROVIDERS[h % REAL_PROVIDERS.length];
}
