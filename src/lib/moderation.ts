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

// Digit/diacritic leetspeak folded to letters. Punctuation is left intact here
// so it can be removed as a SEPARATOR in the stripped pass (see containsHate).
function leetLetters(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0]/g, "o")
    .replace(/[1]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[69q]/g, "g")
    .replace(/[7]/g, "t");
}

// Same leet folding, plus punctuation that stands in for a letter (! | -> i),
// so "n!gger" reads as "nigger" for the word-boundary pass.
function normalize(s: string): string {
  return leetLetters(s).replace(/[!|]/g, "i");
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

// A gappy matcher per slur: each letter one-or-more times, in order, with no
// gaps (separators are already removed before this runs). "nigger" becomes
// /n+i+g+g+e+r+/, so ANY amount of letter-doubling ("niiigger"), leet ("n1gg3r",
// "ni66er", "niqqer") or inserted separators ("n!igger", "n i g g e r") collapse
// to a hit. Crucially it still requires the real letter sequence INCLUDING the
// double g, so "Nigeria"/"Niger" (single g) never match.
const GAPPY = new Map<string, RegExp>(
  HATE.filter((s) => s.length >= 5).map((s) => [s, new RegExp(s.split("").map((c) => `${c}+`).join(""))]),
);

function containsHate(text: string): boolean {
  // Pass 1: word-boundary match on lightly normalized text. Matching whole
  // tokens avoids flagging slurs embedded in innocent words (e.g. "spic" in
  // "auspicious", "coon" in "raccoon").
  const norm = normalize(text);
  for (const slur of HATE) {
    if (new RegExp(`\\b${slur}\\b`).test(norm)) return true;
  }
  // Pass 2: strip EVERY non-letter, then gappy-match the longer slurs. This is
  // where obfuscation dies: doubled letters, leet, spaces and punctuation all
  // get folded away. Limited to 5+ letter slurs so it can't fire on short,
  // ambiguous fragments inside ordinary words.
  const stripped = leetLetters(text).replace(/[^a-z]/g, "");
  for (const re of GAPPY.values()) {
    if (re.test(stripped)) return true;
  }
  return false;
}

// Names reserved for the host/official voice, so a regular dev can't pose as
// "Sally" or staff in the campfire. Compared on the letters-only lowercase form.
const RESERVED_NAMES = new Set(["sally", "cynicalsally", "admin", "moderator", "mod", "staff", "official"]);

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
    return { ok: false, reason: "Let's keep it hate-free. Vent all you want, just not like that." };
  }

  return { ok: true, text: text || undefined };
}

// Display names (aliases) run through the SAME hate filter as messages. They show
// up on the map, the feed, the leaderboard and the campfire, so an unmoderated
// name is just a slur with extra reach. Same policy: no links, no slurs. Empty
// returns ok+undefined so the caller can fall back to a generated devName().
export function moderateName(raw: string | undefined): ModerationResult {
  if (!raw) return { ok: true, text: undefined };

  // A name is not a place for links/domains either.
  let text = stripLinks(raw);
  // Names are short; collapse whitespace, trim, cap tighter than messages.
  text = text.replace(/\s{2,}/g, " ").trim().slice(0, 40);

  if (containsHate(text)) {
    return { ok: false, reason: "That name won't fly. Pick one without the slur." };
  }
  // Reserved host identities: nobody gets to impersonate the official voice.
  if (RESERVED_NAMES.has(text.toLowerCase().replace(/[^a-z]/g, ""))) {
    return { ok: false, reason: "That name is reserved. Pick another." };
  }

  return { ok: true, text: text || undefined };
}
