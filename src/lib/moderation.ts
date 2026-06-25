// Moderation for "last words". Policy (per product owner):
//  • Links are NOT allowed — stripped out entirely.
//  • Mild profanity (shit, fuck, damn, …) IS allowed — it's the vibe.
//  • Hate speech / slurs are NOT allowed — the message is rejected.
//
// The hate list below exists solely to FILTER such terms out (defensive use).

const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
// Explicit protocols / www / @handles with a path.
const PROTO_RE = /\b(?:https?:\/\/|ftp:\/\/|www\.)\S+/gi;
// Generic "domain.tld" (optionally with a path) — catches youtube.com, youtu.be,
// bit.ly, t.co, example.org, etc. with NO protocol. Needs 2+ chars before the
// dot and a 2+ letter TLD, so "i.e." / "e.g" don't trip it.
const DOMAIN_RE =
  /\b[a-z0-9][a-z0-9-]{1,62}\.[a-z]{2,24}(?:\/[^\s]*)?\b/gi;

// Un-obfuscate common link evasions ("youtube dot com", "youtube ( dot ) com",
// "youtube . com") into canonical "youtube.com" so the regexes above catch them.
function deObfuscate(text: string): string {
  let t = text;
  for (let i = 0; i < 4; i++) {
    t = t.replace(/([a-z0-9-]{2,})\s*[\[({]?\s*(?:dot|punt|d0t)\s*[\])}]?\s*([a-z0-9-]{2,})/gi, "$1.$2");
    t = t.replace(/([a-z0-9-]{2,})\s*[\[({]\s*\.\s*[\])}]\s*([a-z0-9-]{2,})/gi, "$1.$2");
    t = t.replace(/([a-z0-9-]{2,})\s+\.\s*([a-z]{2,})/gi, "$1.$2");
    t = t.replace(/([a-z0-9-]{2,})\s*\.\s+([a-z]{2,})\b/gi, "$1.$2");
  }
  return t;
}

function stripLinks(text: string): string {
  return deObfuscate(text)
    .replace(EMAIL_RE, "")
    .replace(PROTO_RE, "")
    .replace(DOMAIN_RE, "");
}

// Normalize common leetspeak so "n1gg3r"-style evasion still matches.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t");
}

// Severe slurs (racial, homophobic, antisemitic, ableist, etc.). Word-boundary
// matched on the normalized text; a letters-only collapse catches spaced-out
// evasion. Intentionally excludes ordinary profanity.
const HATE = [
  "nigger", "nigga", "niggers", "faggot", "fag", "faggots", "kike", "spic",
  "chink", "gook", "wetback", "tranny", "trannie", "retard", "retarded",
  "coon", "raghead", "towelhead", "beaner", "dyke", "paki", "shemale",
  "groomer", "subhuman", "untermensch",
];

function containsHate(text: string): boolean {
  const norm = normalize(text);
  for (const slur of HATE) {
    if (new RegExp(`\\b${slur}\\b`).test(norm)) return true;
  }
  const collapsed = norm.replace(/[^a-z]/g, "");
  return HATE.some((slur) => slur.length >= 4 && collapsed.includes(slur));
}

export type ModerationResult =
  | { ok: true; text: string | undefined }
  | { ok: false; reason: string };

export function moderateMessage(raw: string | undefined): ModerationResult {
  if (!raw) return { ok: true, text: undefined };

  // Strip links / domains / emails (incl. obfuscated ones) first.
  let text = stripLinks(raw);
  // Collapse whitespace left behind, trim, cap length.
  text = text.replace(/\s{2,}/g, " ").trim().slice(0, 140);

  if (containsHate(text)) {
    return { ok: false, reason: "Let's keep it hate-free. Vent all you want — just not like that." };
  }

  return { ok: true, text: text || undefined };
}
