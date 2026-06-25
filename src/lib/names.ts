// Random, developer-flavoured aliases — no accounts, no PII, just vibes.

const ADJECTIVES = [
  "Sleepless", "Caffeinated", "Anxious", "Rate-Limited", "Burnt-Out", "Hopeful",
  "Recursive", "Async", "Stubborn", "Undeployed", "Flaky", "Cached", "Throttled",
  "Optimistic", "Debugging", "Refactored", "Yak-Shaving", "Off-By-One", "Stale",
  "Hydrated", "Dangling", "Orphaned", "Vibe-Coding", "Caffeine-Free", "Doomscrolling",
];

const NOUNS = [
  "Goose", "Raptor", "Webpack", "Pointer", "Daemon", "Gremlin", "Cursor", "Mutex",
  "Hamster", "Octopus", "Panda", "Llama", "Walrus", "Ferret", "Penguin", "Badger",
  "Compiler", "Linter", "Regex", "Closure", "Promise", "Callback", "Segfault", "Buffer",
];

/** Deterministic-ish but varied alias. Pass a seed for stable results. */
export function devName(seed?: number): string {
  const r = (n: number) =>
    seed === undefined
      ? Math.floor(Math.random() * n)
      : Math.floor((Math.sin(seed * 99.7 + n) * 0.5 + 0.5) * n);
  const a = ADJECTIVES[r(ADJECTIVES.length)];
  const n = NOUNS[(r(NOUNS.length) + 7) % NOUNS.length];
  return `${a} ${n}`;
}
