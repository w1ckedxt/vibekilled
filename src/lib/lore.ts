// Deterministic absurd lore — seeded by pin id so EVERYONE sees the same
// diagnosis/eulogy/quest for a given pin (no storage needed). Plus a rotating,
// stats-driven "patch notes for the wall" ticker. Pure dev-burnout comedy. 💀🌱

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DIAGNOSES = [
  "Acute Tokenemia",
  "Chronic 429 Syndrome",
  "Context-Window Collapse",
  "Severe Prompt Fatigue",
  "Quota Deficiency",
  "Rate-Limit Whiplash",
  "Terminal Yak-Shaving",
  "Compiler Heartbreak",
  "Hallucination Hangover",
  "Acute Vibe Loss",
  "Dependency-Hell Exposure",
  "Spontaneous Flow-State Failure",
];

/** Absurd "cause of death" for a downed dev. Stable per pin. */
export function diagnosis(seed: string): string {
  return DIAGNOSES[hash(seed + "dx") % DIAGNOSES.length];
}

const EULOGIES = [
  (n: string) => `Here lies ${n}. They wanted to ship. The wall wanted otherwise.`,
  (n: string) => `${n} fought the rate limit. The rate limit won.`,
  (n: string) => `${n} was last seen whispering "just one more prompt".`,
  (n: string) => `In loving memory of ${n}'s flow state. Gone too soon.`,
  (n: string) => `${n} touched the wall so you don't have to.`,
  (n: string) => `${n}: brilliant, caffeinated, and tragically rate-limited.`,
];

/** A one-line tombstone eulogy. Stable per pin. */
export function eulogy(name: string, seed: string): string {
  return EULOGIES[hash(seed + "eu") % EULOGIES.length](name);
}

const GRASS_QUESTS = [
  "Drink a full glass of water 💧",
  "Look at a tree for 10 seconds 🌳",
  "Stretch your wrists & neck 🧘",
  "Step outside, feel the sun ☀️",
  "Take 3 slow, deep breaths 🌬️",
  "Stand up and walk to a window 🪟",
  "Pet an animal (or imagine one) 🐈",
  'Text a friend a simple "hey" 💬',
];

/** Your absurd "touch grass" quest for this wait. Stable per pin. */
export function grassQuest(seed: string): string {
  return GRASS_QUESTS[hash(seed + "gq") % GRASS_QUESTS.length];
}

// Satirical, stats-driven patch notes for "the wall". Rotates by tick.
export function wallStatus(active: number, kills: number, tick: number): string {
  const lines = [
    `${active} dev${active === 1 ? "" : "s"} behind the wall right now.`,
    "Claude cooldown increased due to global skull density.",
    "Gemini feeling whimsical today — expect vibes.",
    "GPT quota futures down 4% on heavy refactor volume.",
    `${kills.toLocaleString()} vibes killed all-time. Pour one out.`,
    "Reminder: grass is free and located outdoors.",
    "Cursor patch notes: it hung. We're aware. It hung again.",
    "Token reserves critically low in several timezones.",
    "Touching grass remains 100% uptime.",
  ];
  return lines[tick % lines.length];
}
