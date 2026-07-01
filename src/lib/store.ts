import { nanoid } from "nanoid";
import { redis, hasRedis } from "./redis";
import type { AdminEvent, FeedEvent, FeedEventType, GlobalStats, LastKill, Pin, ProviderId } from "./types";
import { achievementForCount, type Achievement } from "./achievements";
import { nearbyPoint, obfuscate, placeLabel } from "./geo";
import { devName } from "./names";
import {
  AMBIENT_FLOOR,
  AMBIENT_RECONCILE_SEC,
  AMBIENT_KILL_FEED_P,
  AMBIENT_RESURRECT_FEED_P,
  AMBIENT_FEED_PER_RUN,
  AMBIENT_MIN_MINUTES,
  AMBIENT_MAX_MINUTES,
  LOCAL_MIN,
  LOCAL_MAX,
  LOCAL_MIN_KM,
  LOCAL_MAX_KM,
  LOCAL_RECONCILE_SEC,
  LOCAL_CAP,
  LOCAL_FEED_PER_RUN,
  ambientMessage,
  pickAmbientProvider,
  pickCity,
  randInt,
} from "./ambient";

// ── Keys ────────────────────────────────────────────────────────────────────
const K = {
  pin: (id: string) => `vk:pin:${id}`,
  index: "vk:pins", // zset: member=id, score=expireAt(ms)
  ambientIndex: "vk:ambient", // zset of global ambient (faked) pin ids -> expireAt(ms)
  ambientLock: "vk:ambient:lock", // single-reconciler throttle (global floor)
  localIndex: "vk:ambient:local", // zset of visitor-local ambient pin ids -> expireAt(ms)
  localLock: (cell: string) => `vk:ambient:local:${cell}`, // per-region seeding throttle
  feed: "vk:feed", // list of JSON FeedEvent (newest first)
  lastKill: "vk:lastkill", // JSON LastKill — newest REAL kill, for live map fly
  kills: "vk:stat:kills",
  resurrections: "vk:stat:resurrections",
  userLock: (uid: string) => `vk:user:${uid}:active`, // value=pinId, TTL=recovery
  cooldown: (uid: string) => `vk:user:${uid}:cooldown`, // post-resurrection lockout
  userCount: (uid: string) => `vk:user:${uid}:count`,
  users: "vk:users", // SET of all userIds ever
  statProviders: "vk:stat:providers", // hash provider -> count
  statCountries: "vk:stat:countries", // hash cc -> count
  statDays: "vk:stat:days", // hash YYYY-MM-DD -> count
  presence: "vk:presence", // zset sessionId -> last-seen ms
  chatPresence: "vk:chatpresence", // zset userId -> last-seen ms (around the campfire)
  events: "vk:events", // list of JSON AdminEvent (admin journey feed)
  lbScore: "vk:lb:score", // zset userId -> good4u + sympathy (all-time)
  lbName: "vk:lb:name", // hash userId -> latest alias
  lbGood: "vk:lb:good4u", // hash userId -> good4u RECEIVED
  lbSymp: "vk:lb:sympathy", // hash userId -> sympathy RECEIVED
  // What a user has GIVEN to others (for action-based medals).
  giveGood: "vk:give:good4u", // hash userId -> good4u given
  giveSymp: "vk:give:sympathy", // hash userId -> sympathy given
  giveShake: "vk:give:handshake", // hash userId -> handshakes given
  comments: "vk:give:comments", // hash userId -> messages posted (last words + chat)
  downMin: "vk:user:downmin", // hash userId -> total recovery minutes logged
  streak: "vk:user:streak", // hash userId -> current daily streak
  lastDay: "vk:user:lastday", // hash userId -> last active YYYY-MM-DD
  tetrisPlays: "vk:stat:tetris:plays", // total Campfire Tetris games played
  tetrisHigh: "vk:stat:tetris:high", // highest Tetris score seen
};

const PRESENCE_TTL_MS = 60_000;
// You can't claim a new wall for this long after your own resurrection.
const COOLDOWN_SEC = 3 * 60 * 60;

// Keep resurrected pins visible (for fireworks + feed) for a while after recovery.
const GRACE_MS = 30 * 60 * 1000; // 30 min
const FEED_MAX = 60;
const LIST_CAP = 600;

// ── Serialization ─────────────────────────────────────────────────────────────
function toPin(raw: Record<string, unknown> | null): Pin | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    provider: String(raw.provider) as ProviderId,
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    createdAt: Number(raw.createdAt),
    recoverAt: Number(raw.recoverAt),
    name: String(raw.name),
    message: raw.message ? String(raw.message) : undefined,
    country: raw.country ? String(raw.country) : undefined,
    good4u: Number(raw.good4u ?? 0),
    sympathy: Number(raw.sympathy ?? 0),
    views: Number(raw.views ?? 0),
    handshake: Number(raw.handshake ?? 0),
    resurrected: Number(raw.resurrected ?? 0) === 1,
  };
}

async function pushFeed(ev: Omit<FeedEvent, "id">): Promise<void> {
  const full: FeedEvent = { ...ev, id: nanoid(8) };
  await redis.lpush(K.feed, JSON.stringify(full));
  await redis.ltrim(K.feed, 0, FEED_MAX - 1);
}

// ── Anti-abuse: one active pin per user ───────────────────────────────────────
export async function getUserActivePin(userId: string): Promise<string | null> {
  if (!hasRedis) return null;
  return (await redis.get<string>(K.userLock(userId))) ?? null;
}

/** Seconds remaining on a user's post-resurrection cooldown (0 if none). */
export async function getUserCooldown(userId: string): Promise<number> {
  if (!hasRedis) return 0;
  const ttl = await redis.ttl(K.cooldown(userId));
  return typeof ttl === "number" && ttl > 0 ? ttl : 0;
}

// ── Create (the "Kill") ───────────────────────────────────────────────────────
export interface CreatePinInput {
  userId: string;
  provider: ProviderId;
  lat: number;
  lng: number;
  recoveryMinutes: number;
  name: string;
  message?: string;
  place: string;
  country?: string;
}

export interface CreatePinResult {
  pin: Pin;
  killCount: number;
  achievement: Achievement | null;
}

export async function createPin(input: CreatePinInput): Promise<CreatePinResult> {
  if (!hasRedis) {
    throw Object.assign(new Error("Database not configured — link Upstash Redis on Vercel."), { code: "NO_DB" });
  }
  const now = Date.now();
  const id = nanoid(12);
  const recoverAt = now + input.recoveryMinutes * 60 * 1000;
  const expireAt = recoverAt + GRACE_MS;

  const pin: Pin = {
    id,
    provider: input.provider,
    lat: input.lat,
    lng: input.lng,
    createdAt: now,
    recoverAt,
    name: input.name,
    message: input.message,
    country: input.country,
    good4u: 0,
    sympathy: 0,
    views: 0,
    handshake: 1, // a warm welcome — you're never alone behind the wall 🤝
    resurrected: false,
  };

  await redis.hset(K.pin(id), {
    ...pin,
    message: pin.message ?? "",
    country: pin.country ?? "",
    ownerId: input.userId, // private — used for the leaderboard, never exposed
    resurrected: 0,
  });
  await redis.hset(K.lbName, { [input.userId]: input.name });
  await redis.expire(K.pin(id), Math.ceil((expireAt - now) / 1000));
  await redis.zadd(K.index, { score: expireAt, member: id });

  // Anti-abuse lock: cannot drop a new pin until your own timer runs out.
  await redis.set(K.userLock(input.userId), id, { px: recoverAt - now });

  const killCount = await redis.incr(K.userCount(input.userId));
  const seq = await redis.incr(K.kills); // global running kill number → "Dev Down #N"

  // Live "someone just went down" signal — REAL kills only (ambient pins never
  // reach this path), so an open map can fly straight to the newest casualty.
  await redis.set(K.lastKill, JSON.stringify({ id, lat: pin.lat, lng: pin.lng, at: now, seq }));

  // Aggregate stats for the admin dashboard.
  const today = new Date().toISOString().slice(0, 10);
  await redis.sadd(K.users, input.userId);
  await redis.hincrby(K.statProviders, input.provider, 1);
  if (input.country) await redis.hincrby(K.statCountries, input.country, 1);
  await redis.hincrby(K.statDays, today, 1);

  // Per-user action stats for medals.
  await redis.hincrby(K.downMin, input.userId, input.recoveryMinutes);
  if (input.message) await redis.hincrby(K.comments, input.userId, 1);

  // Daily streak: +1 if you were here yesterday, reset on a gap, keep same-day.
  const last = await redis.hget<string>(K.lastDay, input.userId);
  let streak = 1;
  if (last) {
    const diffDays = Math.round((Date.parse(today) - Date.parse(last)) / 86_400_000);
    const cur = Number((await redis.hget(K.streak, input.userId)) ?? 1);
    if (diffDays === 0) streak = cur;
    else if (diffDays === 1) streak = cur + 1;
    else streak = 1;
  }
  await redis.hset(K.streak, { [input.userId]: streak });
  await redis.hset(K.lastDay, { [input.userId]: today });

  await pushFeed({
    type: "kill",
    name: input.name,
    provider: input.provider,
    place: input.place,
    at: now,
    pinId: id,
    message: input.message,
    country: input.country,
    seq,
    minutes: input.recoveryMinutes,
  });
  await adminLog({ type: "kill", name: input.name, provider: input.provider, country: input.country, text: input.message });

  return { pin, killCount, achievement: achievementForCount(killCount) };
}

// ── List (the "Watch") ────────────────────────────────────────────────────────
export async function listPins(): Promise<Pin[]> {
  if (!hasRedis) return [];
  const now = Date.now();
  // Self-prune anything past its grace window.
  await redis.zremrangebyscore(K.index, 0, now);

  const ids = (await redis.zrange<string[]>(K.index, 0, LIST_CAP - 1, { rev: true })) ?? [];
  if (!ids.length) return [];

  const pipe = redis.pipeline();
  ids.forEach((id) => pipe.hgetall(K.pin(id)));
  const rows = (await pipe.exec()) as Array<Record<string, unknown> | null>;

  // Which owners are currently present (for the online / "back vibing" badge).
  const present = new Set(
    ((await redis.zrange<string[]>(K.presence, now - PRESENCE_TTL_MS, "+inf", { byScore: true })) ?? []).map(String),
  );

  const pins: Pin[] = [];
  for (const row of rows) {
    const pin = toPin(row);
    if (!pin) continue;
    const owner = row?.ownerId ? String(row.ownerId) : undefined;
    const isAmbient = Number(row?.ambient ?? 0) === 1;
    pin.online = owner ? present.has(owner) : false;
    // Lazy resurrection: celebrate the moment the timer crosses zero, and gift
    // an automatic Good4U so the comeback never goes uncelebrated.
    if (!pin.resurrected && pin.recoverAt <= now) {
      pin.resurrected = true;
      pin.good4u += 1;
      await redis.hset(K.pin(pin.id), { resurrected: 1 });
      await redis.hincrby(K.pin(pin.id), "good4u", 1);
      // Ambient (faked) pins are visual only: fireworks + an occasional feed
      // event, but never the real counters, cooldown, or admin journey.
      if (!isAmbient) {
        await redis.incr(K.resurrections);
        // 3h cooldown: no claiming a fresh wall right after coming back.
        if (owner) await redis.set(K.cooldown(owner), 1, { ex: COOLDOWN_SEC });
        await adminLog({ type: "resurrection", name: pin.name, provider: pin.provider });
      }
      if (!isAmbient || Math.random() < AMBIENT_RESURRECT_FEED_P) {
        await pushFeed({ type: "resurrection", name: pin.name, provider: pin.provider, place: "", at: now, pinId: pin.id });
      }
    }
    pins.push(pin);
  }
  return pins;
}

export async function getPin(id: string): Promise<Pin | null> {
  if (!hasRedis) return null;
  const raw = await redis.hgetall(K.pin(id));
  const pin = toPin(raw);
  if (pin && raw?.ownerId) {
    const score = await redis.zscore(K.presence, String(raw.ownerId));
    pin.online = typeof score === "number" && score > Date.now() - PRESENCE_TTL_MS;
  }
  return pin;
}

// ── Ambient "down devs" (worldwide faked floor) ───────────────────────────────
// Keeps the map alive on arrival. A Redis NX lock means only one request per
// reconcile interval actually does work — the rest no-op cheaply. New pins are
// minted with staggered ages so a fresh visitor sees varied countdowns, not a
// wall of identical timers. Writes are pipelined into ~one round trip.

interface AmbientDraft {
  id: string;
  hash: Record<string, string | number>;
  expireAt: number;
  feed?: Omit<FeedEvent, "id">;
}

/** Where an ambient pin originates: a global hub, or a point near a visitor. */
interface AmbientOrigin {
  lat: number;
  lng: number;
  cc?: string;
}

function buildAmbientPin(now: number, origin?: AmbientOrigin): AmbientDraft {
  const id = nanoid(12);
  const src: AmbientOrigin = origin ?? pickCity();
  const { lat, lng } = obfuscate(src.lat, src.lng);
  const cc = src.cc;
  const provider = pickAmbientProvider();
  const name = devName();

  const lifespanMin = randInt(AMBIENT_MIN_MINUTES, AMBIENT_MAX_MINUTES);
  // Backdate the kill by up to ~60% of its lifespan so time-left varies on load
  // while still guaranteeing recoverAt stays in the future.
  const ageMs = randInt(0, Math.floor(lifespanMin * 0.6)) * 60_000;
  const createdAt = now - ageMs;
  const recoverAt = createdAt + lifespanMin * 60_000;
  const expireAt = recoverAt + GRACE_MS;

  const message = Math.random() < 0.4 ? ambientMessage() : "";
  // A little pre-existing solidarity so they don't all read as untouched zeros.
  const good4u = randInt(0, 4);
  const sympathy = randInt(0, 6);
  const handshake = 1 + randInt(0, 3);
  const views = randInt(0, 30);

  const hash: Record<string, string | number> = {
    id,
    provider,
    lat,
    lng,
    createdAt,
    recoverAt,
    name,
    message,
    country: cc ?? "",
    good4u,
    sympathy,
    views,
    handshake,
    resurrected: 0,
    ambient: 1, // internal marker — never surfaced to clients (toPin ignores it)
  };

  const feed: Omit<FeedEvent, "id"> | undefined =
    Math.random() < AMBIENT_KILL_FEED_P
      ? {
          type: "kill",
          name,
          provider,
          place: placeLabel(cc),
          at: createdAt,
          pinId: id,
          message: message || undefined,
          country: cc,
          minutes: lifespanMin,
        }
      : undefined;

  return { id, hash, expireAt, feed };
}

/** Persist a batch of ambient drafts: pipelined hash + expiry + both the shared
 *  map index and a per-flavour index (global floor vs visitor-local), then a
 *  capped feed trickle so the Globe of Pain looks live without drowning real kills. */
async function writeAmbientDrafts(
  drafts: AmbientDraft[],
  index: string,
  feedCap: number,
  now: number,
): Promise<void> {
  if (!drafts.length) return;
  const pipe = redis.pipeline();
  for (const d of drafts) {
    pipe.hset(K.pin(d.id), d.hash);
    pipe.expire(K.pin(d.id), Math.ceil((d.expireAt - now) / 1000));
    pipe.zadd(K.index, { score: d.expireAt, member: d.id });
    pipe.zadd(index, { score: d.expireAt, member: d.id });
  }
  await pipe.exec();
  const feeds = drafts.map((d) => d.feed).filter(Boolean).slice(0, feedCap) as Omit<FeedEvent, "id">[];
  for (const f of feeds) await pushFeed(f);
}

/** Top the worldwide ambient floor back up. Cheap + throttled; safe to call on
 *  every map fetch. Real pins live in a separate index, so the floor is purely
 *  faked devs and never blocks or counts real activity. */
export async function ensureAmbientPins(): Promise<void> {
  if (!hasRedis) return;
  // Only one server reconciles per interval — everyone else returns instantly.
  const lock = await redis.set(K.ambientLock, 1, { nx: true, ex: AMBIENT_RECONCILE_SEC });
  if (!lock) return;

  const now = Date.now();
  await redis.zremrangebyscore(K.ambientIndex, 0, now);
  const alive = Number((await redis.zcard(K.ambientIndex)) ?? 0);
  const deficit = AMBIENT_FLOOR - alive;
  if (deficit <= 0) return;

  const drafts: AmbientDraft[] = [];
  for (let i = 0; i < deficit; i++) drafts.push(buildAmbientPin(now));
  await writeAmbientDrafts(drafts, K.ambientIndex, AMBIENT_FEED_PER_RUN, now);
}

/** Drop a small cluster of faked devs *near* a fresh visitor so their own area
 *  looks alive on arrival. Throttled per ~111km cell so a busy region never
 *  piles up. These live in their own index and never affect the global floor. */
export async function ensureLocalAmbientPins(lat: number, lng: number, cc?: string): Promise<void> {
  if (!hasRedis) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  // One seeding per coarse cell per window — collapses repeat visits + pollers.
  const cell = `${Math.round(lat)}:${Math.round(lng)}`;
  const lock = await redis.set(K.localLock(cell), 1, { nx: true, ex: LOCAL_RECONCILE_SEC });
  if (!lock) return;

  const now = Date.now();
  await redis.zremrangebyscore(K.localIndex, 0, now);

  // Hard ceiling: never let local pins grow past LOCAL_CAP, however many distinct
  // visitor regions (or crawlers) trigger seeding.
  const alive = Number((await redis.zcard(K.localIndex)) ?? 0);
  const room = LOCAL_CAP - alive;
  if (room <= 0) return;

  const count = Math.min(randInt(LOCAL_MIN, LOCAL_MAX), room);
  const drafts: AmbientDraft[] = [];
  for (let i = 0; i < count; i++) {
    const near = nearbyPoint(lat, lng, LOCAL_MIN_KM, LOCAL_MAX_KM);
    drafts.push(buildAmbientPin(now, { lat: near.lat, lng: near.lng, cc }));
  }
  await writeAmbientDrafts(drafts, K.localIndex, LOCAL_FEED_PER_RUN, now);
}

// ── Reactions (Good4U / Extend Sympathy / view) ──────────────────────────────
const FIELD: Record<string, { field: keyof Pin; feed?: FeedEventType }> = {
  good4u: { field: "good4u", feed: "good4u" },
  sympathy: { field: "sympathy", feed: "sympathy" },
  handshake: { field: "handshake", feed: "handshake" },
  view: { field: "views" },
};

export async function react(
  id: string,
  action: keyof typeof FIELD,
  reactorId?: string,
  actorCountry?: string,
): Promise<Pin | null> {
  if (!hasRedis) return null;
  const spec = FIELD[action];
  if (!spec) return null;
  const exists = await redis.exists(K.pin(id));
  if (!exists) return null;

  // No reacting to your own pin — you can't cheer/sympathize/"I hear you" yourself.
  // (views are fine; they're anonymous and never hit the feed.)
  if (reactorId && action !== "view") {
    const owner = await redis.hget<string>(K.pin(id), "ownerId");
    if (owner && owner === reactorId) return await getPin(id);
  }

  await redis.hincrby(K.pin(id), spec.field, 1);

  // Feed the all-time leaderboard: good4u + sympathy build a user's vibe score.
  if (action === "good4u" || action === "sympathy") {
    const ownerId = await redis.hget<string>(K.pin(id), "ownerId");
    if (ownerId) {
      await redis.zincrby(K.lbScore, 1, ownerId);
      await redis.hincrby(action === "good4u" ? K.lbGood : K.lbSymp, ownerId, 1);
    }
  }

  // Track what the reactor GAVE (for action-based medals).
  if (reactorId && action !== "view") {
    const giveKey = action === "good4u" ? K.giveGood : action === "sympathy" ? K.giveSymp : K.giveShake;
    await redis.hincrby(giveKey, reactorId, 1);
  }

  const pin = await getPin(id);
  if (pin && spec.feed && action !== "view") {
    await pushFeed({
      type: spec.feed,
      name: pin.name,
      provider: pin.provider,
      place: "",
      at: Date.now(),
      pinId: pin.id,
      country: pin.country,
      actorCountry,
    });
    await adminLog({ type: action as AdminEvent["type"], name: pin.name, provider: pin.provider, country: pin.country, actorCountry });
  }
  return pin;
}

// ── Feed + stats ──────────────────────────────────────────────────────────────
export async function getFeed(): Promise<FeedEvent[]> {
  if (!hasRedis) return [];
  const raw = (await redis.lrange<string | FeedEvent>(K.feed, 0, FEED_MAX - 1)) ?? [];
  return raw
    .map((r) => (typeof r === "string" ? safeParse(r) : r))
    .filter((x): x is FeedEvent => Boolean(x));
}

// PUBLIC stats — intentionally counts ambient (seeded) pins in `active` so the
// homepage never feels empty. For the real, ambient-free number see realActive().
export async function getStats(): Promise<GlobalStats> {
  if (!hasRedis) return { kills: 0, resurrections: 0, active: 0 };
  const [kills, resurrections, active, last] = await Promise.all([
    redis.get<number>(K.kills),
    redis.get<number>(K.resurrections),
    redis.zcard(K.index),
    redis.get<LastKill | string>(K.lastKill),
  ]);
  // Upstash may return the value already parsed or as a raw JSON string —
  // tolerate both so the live map signal survives either client config.
  let lastKill: LastKill | null = null;
  if (last) lastKill = typeof last === "string" ? (safeJsonObj<LastKill>(last)) : last;
  return {
    kills: Number(kills ?? 0),
    resurrections: Number(resurrections ?? 0),
    active: Number(active ?? 0),
    lastKill,
  };
}

function safeJsonObj<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// REAL "down now" — the global index mixes in ambient (seeded) pins, so subtract
// both ambient sets. zcount(now, +inf) ignores expired-but-not-yet-trimmed
// entries, keeping every set on equal footing. Admin-only (true picture).
export async function realActive(): Promise<number> {
  if (!hasRedis) return 0;
  const now = Date.now();
  const [total, ambient, local] = await Promise.all([
    redis.zcount(K.index, now, "+inf"),
    redis.zcount(K.ambientIndex, now, "+inf"),
    redis.zcount(K.localIndex, now, "+inf"),
  ]);
  return Math.max(0, Number(total ?? 0) - Number(ambient ?? 0) - Number(local ?? 0));
}

function safeParse(s: string): FeedEvent | null {
  try {
    return JSON.parse(s) as FeedEvent;
  } catch {
    return null;
  }
}

// ── Campfire presence ("X around the fire" = real humans behind the wall) ─────
/** Register/refresh campfire presence; returns how many real humans are around
 *  the fire right now. Powers the live count on your card — no chat involved. */
export async function joinCampfire(userId: string): Promise<number> {
  if (!hasRedis) return 0;
  const now = Date.now();
  await redis.zadd(K.chatPresence, { score: now, member: userId });
  await redis.zremrangebyscore(K.chatPresence, 0, now - PRESENCE_TTL_MS);
  return Number((await redis.zcard(K.chatPresence)) ?? 0);
}

export async function chatLiveCount(): Promise<number> {
  if (!hasRedis) return 0;
  await redis.zremrangebyscore(K.chatPresence, 0, Date.now() - PRESENCE_TTL_MS);
  return Number((await redis.zcard(K.chatPresence)) ?? 0);
}

// ── Campfire Tetris (kill time behind the wall) ───────────────────────────────
export interface TetrisResult {
  userId: string;
  name: string;
  provider: ProviderId;
  score: number;
  lines: number;
}

/** Record a finished Campfire Tetris game: bumps the play counter + high score
 *  and drops a "played Tetris" beat into the admin journey. Gated on an active
 *  pin (same wall the Campfire itself requires) so only real, down devs count —
 *  no bots or drive-by spam. Returns false when it didn't count. */
export async function recordTetris(r: TetrisResult): Promise<boolean> {
  if (!hasRedis) return false;
  if (!r.userId || !(await getUserActivePin(r.userId))) return false;
  await redis.incr(K.tetrisPlays);
  const prevHigh = Number((await redis.get(K.tetrisHigh)) ?? 0);
  if (r.score > prevHigh) await redis.set(K.tetrisHigh, r.score);
  await adminLog({
    type: "tetris",
    name: r.name,
    provider: r.provider,
    text: `scored ${r.score.toLocaleString()} · ${r.lines} line${r.lines === 1 ? "" : "s"}`,
  });
  return true;
}

// ── Admin journey log ─────────────────────────────────────────────────────────
const EVENTS_MAX = 150;

export async function adminLog(ev: Omit<AdminEvent, "id" | "at">): Promise<void> {
  if (!hasRedis) return;
  const full: AdminEvent = { ...ev, id: nanoid(6), at: Date.now() };
  await redis.lpush(K.events, JSON.stringify(full));
  await redis.ltrim(K.events, 0, EVENTS_MAX - 1);
}

export async function getEvents(): Promise<AdminEvent[]> {
  if (!hasRedis) return [];
  const raw = (await redis.lrange<string | AdminEvent>(K.events, 0, EVENTS_MAX - 1)) ?? [];
  return raw
    .map((r) => {
      if (typeof r !== "string") return r;
      try {
        return JSON.parse(r) as AdminEvent;
      } catch {
        return null;
      }
    })
    .filter((x): x is AdminEvent => Boolean(x));
}

// ── Presence ("online now") ───────────────────────────────────────────────────
export async function heartbeat(sessionId: string, country?: string): Promise<number> {
  if (!hasRedis) return 0;
  const now = Date.now();
  const existed = await redis.zscore(K.presence, sessionId);
  await redis.zadd(K.presence, { score: now, member: sessionId });
  await redis.zremrangebyscore(K.presence, 0, now - PRESENCE_TTL_MS);
  // First time we see this session → a "landed on the page" journey event.
  if (existed === null || existed === undefined) {
    await adminLog({ type: "land", country });
  }
  return Number((await redis.zcard(K.presence)) ?? 0);
}

export async function onlineCount(): Promise<number> {
  if (!hasRedis) return 0;
  await redis.zremrangebyscore(K.presence, 0, Date.now() - PRESENCE_TTL_MS);
  return Number((await redis.zcard(K.presence)) ?? 0);
}

// ── Leaderboard (the "Vibe King") ─────────────────────────────────────────────
export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
  good4u: number;
  sympathy: number;
}

export async function getLeaderboard(limit = 10): Promise<LeaderRow[]> {
  if (!hasRedis) return [];
  // Top scorers with their scores.
  const raw = (await redis.zrange<(string | number)[]>(K.lbScore, 0, limit - 1, { rev: true, withScores: true })) ?? [];
  if (!raw.length) return [];

  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    ids.push(String(raw[i]));
    scores.push(Number(raw[i + 1]));
  }

  const [names, goods, symps] = await Promise.all([
    redis.hmget<Record<string, string>>(K.lbName, ...ids),
    redis.hmget<Record<string, string>>(K.lbGood, ...ids),
    redis.hmget<Record<string, string>>(K.lbSymp, ...ids),
  ]);

  return ids.map((id, i) => ({
    rank: i + 1,
    name: names?.[id] ?? "Anonymous Dev",
    score: scores[i],
    good4u: Number(goods?.[id] ?? 0),
    sympathy: Number(symps?.[id] ?? 0),
  }));
}

// ── Personal all-time stats (the "You" tab) ───────────────────────────────────
export interface UserStats {
  kills: number;
  good4u: number; // received
  sympathy: number; // received
  score: number;
  rank: number | null;
  gaveGood4u: number;
  gaveSympathy: number;
  gaveHandshake: number;
  comments: number;
  downMinutes: number;
  streak: number;
}

const ZERO_STATS: UserStats = {
  kills: 0, good4u: 0, sympathy: 0, score: 0, rank: null,
  gaveGood4u: 0, gaveSympathy: 0, gaveHandshake: 0, comments: 0, downMinutes: 0, streak: 0,
};

export async function getUserStats(userId: string): Promise<UserStats> {
  if (!hasRedis || !userId) return { ...ZERO_STATS };
  const [kills, good4u, sympathy, score, rank, gaveGood4u, gaveSympathy, gaveHandshake, comments, downMinutes, streak] =
    await Promise.all([
      redis.get<number>(K.userCount(userId)),
      redis.hget<number>(K.lbGood, userId),
      redis.hget<number>(K.lbSymp, userId),
      redis.zscore(K.lbScore, userId),
      redis.zrevrank(K.lbScore, userId),
      redis.hget<number>(K.giveGood, userId),
      redis.hget<number>(K.giveSymp, userId),
      redis.hget<number>(K.giveShake, userId),
      redis.hget<number>(K.comments, userId),
      redis.hget<number>(K.downMin, userId),
      redis.hget<number>(K.streak, userId),
    ]);
  return {
    kills: Number(kills ?? 0),
    good4u: Number(good4u ?? 0),
    sympathy: Number(sympathy ?? 0),
    score: Number(score ?? 0),
    rank: rank === null || rank === undefined ? null : Number(rank) + 1,
    gaveGood4u: Number(gaveGood4u ?? 0),
    gaveSympathy: Number(gaveSympathy ?? 0),
    gaveHandshake: Number(gaveHandshake ?? 0),
    comments: Number(comments ?? 0),
    downMinutes: Number(downMinutes ?? 0),
    streak: Number(streak ?? 0),
  };
}

// ── Admin dashboard ───────────────────────────────────────────────────────────
export interface AdminStats {
  online: number;
  liveInChat: number;
  totalUsers: number;
  kills: number;
  resurrections: number;
  active: number;
  providers: Record<string, number>;
  countries: Record<string, number>;
  days: Record<string, number>;
  leaderboard: LeaderRow[];
  events: AdminEvent[];
  tetrisPlays: number;
  tetrisHigh: number;
}

function toNumMap(h: Record<string, unknown> | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(h ?? {})) out[k] = Number(v);
  return out;
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!hasRedis) {
    return { online: 0, liveInChat: 0, totalUsers: 0, kills: 0, resurrections: 0, active: 0, providers: {}, countries: {}, days: {}, leaderboard: [], events: [], tetrisPlays: 0, tetrisHigh: 0 };
  }
  const [online, liveInChat, totalUsers, base, downReal, providers, countries, days, leaderboard, events, tetrisPlays, tetrisHigh] = await Promise.all([
    onlineCount(),
    chatLiveCount(),
    redis.scard(K.users),
    getStats(),
    realActive(),
    redis.hgetall(K.statProviders),
    redis.hgetall(K.statCountries),
    redis.hgetall(K.statDays),
    getLeaderboard(20),
    getEvents(),
    redis.get<number>(K.tetrisPlays),
    redis.get<number>(K.tetrisHigh),
  ]);
  return {
    online,
    liveInChat,
    totalUsers: Number(totalUsers ?? 0),
    kills: base.kills,
    resurrections: base.resurrections,
    // Admin sees the REAL down count (ambient stripped); public keeps the pump.
    active: downReal,
    providers: toNumMap(providers),
    countries: toNumMap(countries),
    days: toNumMap(days),
    leaderboard,
    events,
    tetrisPlays: Number(tetrisPlays ?? 0),
    tetrisHigh: Number(tetrisHigh ?? 0),
  };
}
