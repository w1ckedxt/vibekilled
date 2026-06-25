// Medal system. Unlocks are derived server-side from real, hard-to-fake metrics:
//   kills      — how many times you've hit the wall (one active pin at a time)
//   good4u     — comeback cheers you've RECEIVED (all-time)
//   sympathy   — sympathy you've RECEIVED while down (all-time)
//   score      — good4u + sympathy combined (your "vibe" score)

export type Metric =
  | "kills"
  | "good4u"
  | "sympathy"
  | "score"
  | "gaveGood4u"
  | "gaveSympathy"
  | "gaveHandshake"
  | "comments"
  | "downMinutes"
  | "streak";

export interface Achievement {
  id: string;
  metric: Metric;
  threshold: number;
  title: string;
  blurb: string;
  emoji: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Kills: how often you've been walled ──
  { id: "first-one", metric: "kills", threshold: 1, title: "First One!", blurb: "Your first wall. Welcome to the club nobody asked to join.", emoji: "🥇" },
  { id: "again-wow", metric: "kills", threshold: 2, title: "Again? Wow", blurb: "Back so soon? The model missed you too.", emoji: "😅" },
  { id: "serial-limiter", metric: "kills", threshold: 5, title: "Serial Limiter", blurb: "Five strikes. Maybe it's not you. (It's the quota.)", emoji: "🔁" },
  { id: "rate-limit-royalty", metric: "kills", threshold: 10, title: "Rate Limit Royalty", blurb: "Ten kills. You wear the 429 crown now.", emoji: "👑" },
  { id: "touch-grass", metric: "kills", threshold: 25, title: "Touch Grass", blurb: "Twenty-five. Genuinely, the grass is right there.", emoji: "🌱" },
  { id: "wall-veteran", metric: "kills", threshold: 50, title: "Wall Veteran", blurb: "Fifty walls survived. Purple heart pending.", emoji: "🎖️" },
  { id: "centurion", metric: "kills", threshold: 100, title: "Centurion of Cooldowns", blurb: "One hundred. The quota gods know your name.", emoji: "🏛️" },

  // ── Good4U received: people celebrating your comeback ──
  { id: "first-cheer", metric: "good4u", threshold: 1, title: "First Cheer", blurb: "Someone celebrated your comeback. Aww.", emoji: "💛" },
  { id: "crowd-favorite", metric: "good4u", threshold: 10, title: "Crowd Favorite", blurb: "Ten cheers. People are rooting for you.", emoji: "📣" },
  { id: "beloved", metric: "good4u", threshold: 50, title: "Beloved", blurb: "Fifty comeback cheers. A genuine fan club.", emoji: "🌟" },
  { id: "peoples-champ", metric: "good4u", threshold: 100, title: "People's Champ", blurb: "A hundred cheers. The internet loves you.", emoji: "🏆" },

  // ── Sympathy received: shared suffering ──
  { id: "first-sympathy", metric: "sympathy", threshold: 1, title: "Not Alone", blurb: "Someone felt your pain. You're not coding into the void.", emoji: "🫂" },
  { id: "misery-magnet", metric: "sympathy", threshold: 10, title: "Misery Magnet", blurb: "Ten sympathies. Misery really does love company.", emoji: "💧" },
  { id: "grief-lord", metric: "sympathy", threshold: 50, title: "Grief Lord", blurb: "Fifty hearts felt your pain. Tragic and beautiful.", emoji: "🖤" },

  // ── Vibe score: the king-maker ──
  { id: "vibe-lord", metric: "score", threshold: 25, title: "Vibe Lord", blurb: "Twenty-five total vibes. Climbing the throne.", emoji: "🔥" },
  { id: "vibe-royalty", metric: "score", threshold: 100, title: "Vibe Royalty", blurb: "A hundred vibes. Bow before the down-bad.", emoji: "💎" },
  { id: "the-vibe-king", metric: "score", threshold: 250, title: "The Vibe King", blurb: "Two-fifty. The craziest vibe-voter alive. 👑", emoji: "👑" },

  // ── Sympathy GIVEN: being there for others ──
  { id: "good-samaritan", metric: "gaveSympathy", threshold: 1, title: "Good Samaritan", blurb: "You sent your first sympathy. Real one.", emoji: "🤲" },
  { id: "empath", metric: "gaveSympathy", threshold: 10, title: "Empath", blurb: "Ten sympathies given. You feel it for everyone.", emoji: "💞" },
  { id: "shoulder-for-all", metric: "gaveSympathy", threshold: 50, title: "Shoulder For All", blurb: "Fifty sympathies. The world's collective shoulder.", emoji: "🫂" },

  // ── Good4U GIVEN: celebrating comebacks ──
  { id: "hype-man", metric: "gaveGood4u", threshold: 1, title: "Hype Man", blurb: "You celebrated someone's resurrection. 🎉", emoji: "🎉" },
  { id: "cheer-captain", metric: "gaveGood4u", threshold: 10, title: "Cheer Captain", blurb: "Ten comebacks celebrated. Pom-poms ready.", emoji: "📣" },
  { id: "resurrection-fan", metric: "gaveGood4u", threshold: 50, title: "Resurrection Fanatic", blurb: "Fifty revivals cheered. You live for the comeback.", emoji: "🎆" },

  // ── Handshakes GIVEN: "I hear you" ──
  { id: "i-hear-you", metric: "gaveHandshake", threshold: 1, title: "I Hear You", blurb: "Your first handshake. Connection made.", emoji: "🤝" },
  { id: "the-listener", metric: "gaveHandshake", threshold: 25, title: "The Listener", blurb: "Twenty-five 'I hear you's. A true ally.", emoji: "👂" },

  // ── Comments: speaking up ──
  { id: "first-words", metric: "comments", threshold: 1, title: "First Words", blurb: "You left a message. The void heard you.", emoji: "💬" },
  { id: "chatterbox", metric: "comments", threshold: 10, title: "Chatterbox", blurb: "Ten messages around the campfire.", emoji: "🗣️" },
  { id: "bard-of-the-wall", metric: "comments", threshold: 50, title: "Bard of the Wall", blurb: "Fifty messages. Poet of the penalty box.", emoji: "🎤" },

  // ── Streaks: consistency (or chronic suffering) ──
  { id: "two-day-streak", metric: "streak", threshold: 2, title: "Here We Go Again", blurb: "Two days in a row. The wall remembers you.", emoji: "📅" },
  { id: "week-streak", metric: "streak", threshold: 7, title: "Weekly Regular", blurb: "Seven-day streak. This is your spot now.", emoji: "🗓️" },
  { id: "month-streak", metric: "streak", threshold: 30, title: "Wall-Married", blurb: "Thirty days straight. Til quota do you part.", emoji: "💍" },

  // ── Total downtime: time served ──
  { id: "hour-served", metric: "downMinutes", threshold: 60, title: "An Hour Served", blurb: "One full hour of cumulative downtime.", emoji: "⏳" },
  { id: "day-served", metric: "downMinutes", threshold: 1440, title: "A Day in the Hole", blurb: "24 hours total behind the wall.", emoji: "🕳️" },
  { id: "week-served", metric: "downMinutes", threshold: 10080, title: "Hard Time", blurb: "A full week of downtime, all-time. Respect.", emoji: "⛓️" },
];

/** Kill-milestone unlocked at exactly this count (drives the live toast on drop). */
export function achievementForCount(count: number): Achievement | null {
  return ACHIEVEMENTS.find((a) => a.metric === "kills" && a.threshold === count) ?? null;
}

export type MetricSnapshot = Record<Metric, number>;

/** Every medal earned given a user's metric snapshot. */
export function earnedAchievements(s: MetricSnapshot): Achievement[] {
  return ACHIEVEMENTS.filter((a) => s[a.metric] >= a.threshold);
}
