import { devName } from "./names";
import { PROVIDER_LIST } from "./providers";
import type { ProviderId } from "./types";

// Ambient "campfire" chatter. To users these look like ordinary anonymous devs
// (random aliases); internally they're flagged bots so the campfire never feels
// empty. They drop a single relatable line when someone joins.

const LINES = [
  "ugh, third time today 🫠",
  "anyone else just vibing in the cooldown corner?",
  "the quota giveth and the quota taketh away",
  "brb, touching grass (allegedly)",
  "we ride at dawn 🐎",
  "this is fine. everything is fine. 🔥",
  "i was SO close to shipping too",
  "mid-refactor of course. classic.",
  "respect to everyone behind the wall rn 🤝",
  "another soul joins the fire 🔥",
  "coffee count: yes",
  "it always hits during the good part",
  "5 more minutes... then 5 more...",
  "solidarity, friends 🫂",
  "the wall is undefeated today huh",
  "rate limits build character (cope)",
  "who else is just refreshing the timer 👀",
  "we suffer, but we suffer together",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomProvider(): ProviderId {
  return pick(PROVIDER_LIST).id;
}

export interface BotMessage {
  name: string;
  provider: ProviderId;
  text: string;
}

/** A single bot line (a fresh random alias each time). */
export function botLine(): BotMessage {
  return { name: devName(), provider: randomProvider(), text: pick(LINES) };
}

/** A handful of distinct ambient lines to seed an empty campfire. */
export function seedLines(n: number): BotMessage[] {
  const used = new Set<string>();
  const out: BotMessage[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 50) {
    const m = botLine();
    if (used.has(m.text)) continue;
    used.add(m.text);
    out.push(m);
  }
  return out;
}
