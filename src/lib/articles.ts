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
];

export function articleById(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}
