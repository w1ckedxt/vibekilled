// LOLReads — satirical "how to survive the outside world" articles for devs
// stuck behind the wall. Pure comedy; deadpan dev-burnout tone. Body is an array
// of paragraphs (strings). Keep them short and screenshot-able.

export interface Article {
  id: string;
  emoji: string;
  title: string;
  dek: string; // one-line subtitle
  readMins: number;
  body: string[];
}

export const ARTICLES: Article[] = [
  {
    id: "touch-grass",
    emoji: "🌱",
    title: "How To: Touch Grass",
    dek: "A hands-on guide to the green outdoor texture.",
    readMins: 2,
    body: [
      "Grass is a free, open-source ground covering that ships pre-installed on most of the planet. No API key required.",
      "Step 1: Locate a door. This is a rectangular portal, usually load-bearing, found at the edge of most rooms.",
      "Step 2: Open the door. There is no documentation, but it is intuitive. Push or pull. (Yes, this is the same energy as your last deploy.)",
      "Step 3: Walk forward until the floor turns green and slightly damp. Crouch. Extend one (1) hand. Make contact.",
      "Congratulations — you have touched grass. Latency is high (~4 billion years since install) but uptime is excellent. There is no rate limit.",
    ],
  },
  {
    id: "what-is-outside",
    emoji: "🚪",
    title: "What Is Outside?",
    dek: "An explainer on the world's largest unstyled component.",
    readMins: 2,
    body: [
      "Outside is a vast, always-on environment that renders in real time at an unbelievable framerate. No build step. No hydration. It just… is.",
      "It has no dark mode toggle. The lighting is handled by a single, extremely powerful light source (see: 'Is The Sky Real?').",
      "Common features include: trees (tall green components), wind (an ambient animation), and other humans (peer nodes, see 'Social Interactions').",
      "Outside cannot be npm installed. You must go there. We know. We're sorry.",
    ],
  },
  {
    id: "is-the-sky-real",
    emoji: "☁️",
    title: "Is The Sky Real?",
    dek: "An investigation into the giant blue ceiling.",
    readMins: 3,
    body: [
      "The sky is a large, gradient background that updates roughly twice daily — once to a warm orange (sunset.css) and once to deep navy (night mode).",
      "It appears to be responsive: it resizes perfectly to any viewport, including ones you walk to. No media queries detected.",
      "At night, it ships thousands of tiny white pixels called 'stars'. These are read-only and cannot be inspected (we tried; the dev tools don't reach).",
      "Verdict: probably real. The render is too good to be a CSS hack, and there's no visible 'Made with Framer' badge in the corner.",
    ],
  },
  {
    id: "water",
    emoji: "💧",
    title: "Water: A Beginner's Guide",
    dek: "The hydration the framework forgot.",
    readMins: 1,
    body: [
      "Water is a clear, runtime-critical liquid that your local instance (your body) requires to avoid throwing errors like 'headache' and 'why am I like this'.",
      "Unlike server-side hydration, this kind happens by pouring water into your face-hole. No mismatch warnings.",
      "Recommended: one glass now. Yes, now. The wall will still be there. It's very patient.",
    ],
  },
  {
    id: "social-interactions",
    emoji: "🗣️",
    title: "Social Interactions: An API Reference",
    dek: "Talking to humans, documented at last.",
    readMins: 3,
    body: [
      "A 'conversation' is a bidirectional stream between two human nodes. It is real-time, lossy, and famously hard to debug.",
      "GET /smalltalk — returns { weather, weekend, 'how's it going' }. Rarely cached. Often awkward.",
      "POST /compliment — body: a kind observation. Returns 200 OK and a measurable serotonin increase on both nodes. Surprisingly cheap to call.",
      "Note: there is no undo. Messages, once sent, are immutable. Choose payloads with care. Unlike git, there is no force-push to someone's memory.",
    ],
  },
  {
    id: "the-sun",
    emoji: "☀️",
    title: "The Sun: Your Body's Original Linter",
    dek: "It will find the bugs you've been hiding indoors.",
    readMins: 2,
    body: [
      "The Sun is a free, always-running background process that compiles vitamin D and flags issues like 'you have not blinked at a horizon in 9 days'.",
      "Exposure is recommended in short sessions. Like a good PR, you want enough to make progress, not so much you get burned.",
      "Warning: prolonged use may cause side effects such as 'feeling slightly better' and 'remembering you have a body'. These are not bugs.",
    ],
  },
  {
    id: "sleep",
    emoji: "😴",
    title: "Sleep: The Original Dark Mode",
    dek: "A nightly maintenance window for your meat server.",
    readMins: 2,
    body: [
      "Sleep is a scheduled downtime where your brain garbage-collects, defragments memory, and quietly fixes three bugs you were stuck on.",
      "It is the only deploy that goes better the less you think about it. Forcing it never works; you have to let the process exit gracefully.",
      "Recommended runtime: ~8 hours. Running on 4 is technically possible, the same way prod is technically up while on fire.",
      "Pro tip: the solution you've been hunting all day usually arrives at hour 7, unprompted, like an uninvited but correct code review.",
    ],
  },
  {
    id: "birds",
    emoji: "🐦",
    title: "Birds: Notifications You Can't Mute",
    dek: "Outdoor push alerts with surprisingly good UX.",
    readMins: 1,
    body: [
      "Birds are small, autonomous outdoor agents that emit audio notifications at dawn. There is no settings panel. There is no 'do not disturb'.",
      "Unlike Slack, their pings carry no action items. You are not expected to reply. You are not on call. Revolutionary.",
      "Some users report that listening for 60 seconds lowers cortisol more effectively than closing 11 browser tabs. Results may vary.",
    ],
  },
  {
    id: "cooking",
    emoji: "🍳",
    title: "Cooking: Compiling Food",
    dek: "A build pipeline that ends in lunch.",
    readMins: 2,
    body: [
      "Cooking is the process of taking raw inputs and, through heat, producing a runnable meal. Think of it as a build step you can eat.",
      "The recipe is the documentation. Unlike most docs, it is mostly accurate, though it will lie to you about prep time.",
      "Burning food is just a failed build with great error logging (smoke). Order takeout, refactor, try again tomorrow. Ship lunch.",
    ],
  },
  {
    id: "eye-contact",
    emoji: "👀",
    title: "How To: Make Eye Contact",
    dek: "Establishing a connection without a handshake protocol.",
    readMins: 2,
    body: [
      "Eye contact is a low-bandwidth, high-trust connection opened between two humans. No TLS. Surprisingly secure anyway.",
      "Recommended duration: a few seconds. Holding it for 4 minutes will be interpreted as either love or a challenge to combat. Both are high-stakes.",
      "If overwhelmed, you may glance at the bridge of the nose. The remote node cannot tell the difference. This is the only socially acceptable spoofing.",
    ],
  },
  {
    id: "weekend",
    emoji: "🗓️",
    title: "The Weekend: A Two-Day Maintenance Window",
    dek: "Scheduled downtime you keep forgetting to take.",
    readMins: 1,
    body: [
      "The weekend is a recurring 48-hour window where you are explicitly not on call for your own ambitions.",
      "It exists so the rest of the week doesn't degrade into one long, undifferentiated standup. Use it to run literally any process that isn't work.",
      "Working through it is allowed but unsupported. Side effects include burnout, resentment, and shipping worse code on Monday. Touch grass instead.",
    ],
  },
];

export function articleById(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}
