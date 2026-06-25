// Achievement system. Unlocks are derived server-side from a user's total
// kill count, so they can't be faked by a client. The "one active pin per
// user" rule (enforced in the pins API) means counts can only climb honestly:
// you must actually wait out your own recovery timer before logging again.

export interface Achievement {
  id: string;
  /** Kill count at which this unlocks. */
  threshold: number;
  title: string;
  blurb: string;
  emoji: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-one", threshold: 1, title: "First One!", blurb: "Your first wall. Welcome to the club nobody asked to join.", emoji: "🥇" },
  { id: "again-wow", threshold: 2, title: "Again? Wow", blurb: "Back so soon? The model missed you too.", emoji: "😅" },
  { id: "serial-limiter", threshold: 5, title: "Serial Limiter", blurb: "Five strikes. Maybe it's not you. (It's the quota.)", emoji: "🔁" },
  { id: "rate-limit-royalty", threshold: 10, title: "Rate Limit Royalty", blurb: "Ten kills. You wear the 429 crown now.", emoji: "👑" },
  { id: "touch-grass", threshold: 25, title: "Touch Grass", blurb: "Twenty-five. Genuinely, the grass is right there.", emoji: "🌱" },
];

/** Returns the achievement unlocked at exactly this kill count, if any. */
export function achievementForCount(count: number): Achievement | null {
  return ACHIEVEMENTS.find((a) => a.threshold === count) ?? null;
}

/** All achievements unlocked at or below a given count. */
export function unlockedAchievements(count: number): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.threshold <= count);
}
