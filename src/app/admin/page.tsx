"use client";

import { useCallback, useEffect, useState } from "react";
import { provider } from "@/lib/providers";
import { flagEmoji } from "@/lib/geo";
import { devName } from "@/lib/names";

interface AdminEvent {
  id: string;
  type: "land" | "kill" | "chat" | "good4u" | "sympathy" | "handshake" | "resurrection" | "tetris";
  name?: string;
  provider?: string;
  country?: string;
  text?: string;
  at: number;
}

interface AdminStats {
  online: number;
  liveInChat: number;
  totalUsers: number;
  kills: number;
  resurrections: number;
  active: number;
  providers: Record<string, number>;
  countries: Record<string, number>;
  days: Record<string, number>;
  leaderboard: { rank: number; name: string; score: number; good4u: number; sympathy: number }[];
  events: AdminEvent[];
  chat: { id: string; name: string; provider: string; text: string; at: number; staff?: boolean; bot?: boolean }[];
  tetrisPlays: number;
  tetrisHigh: number;
}

const EVENT_META: Record<AdminEvent["type"], { icon: string; label: string; color: string }> = {
  land: { icon: "🛬", label: "landed on the page", color: "text-white/50" },
  kill: { icon: "💀", label: "tapped I've been hit", color: "text-coral" },
  chat: { icon: "💬", label: "chatted", color: "text-ember" },
  good4u: { icon: "💛", label: "gave Good4U", color: "text-gold" },
  sympathy: { icon: "🫂", label: "gave sympathy", color: "text-emerald-400" },
  handshake: { icon: "🤝", label: "said I hear you", color: "text-electric" },
  resurrection: { icon: "🎆", label: "resurrected", color: "text-gold" },
  tetris: { icon: "🎮", label: "played Tetris", color: "text-ember" },
};

const COOKIE = "vk_admin";

// Persist the admin token in a long-lived cookie so the dash stays unlocked
// across reloads and restarts (no more re-typing the token every visit).
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}
function setCookie(name: string, value: string, days: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Strict`;
}
function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  // The alias the staged message posts under. Blank → the server rolls a random
  // dev name. Kept after sending so you can hold a persona across a few messages.
  const [chatName, setChatName] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const t = getCookie(COOKIE);
    if (t) setToken(t);
  }, []);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { headers: { "x-admin-token": t }, cache: "no-store" });
      if (res.status === 401) {
        setError("Wrong token.");
        clearCookie(COOKIE);
        setToken("");
        return;
      }
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Failed to load.");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    load(token);
    const i = setInterval(() => load(token), 10000);
    return () => clearInterval(i);
  }, [token, load]);

  function submit() {
    const t = input.trim();
    if (!t) return;
    setCookie(COOKIE, t, 30);
    setToken(t);
  }

  function logout() {
    clearCookie(COOKIE);
    setToken("");
    setData(null);
  }

  // Seed the campfire as a regular-looking dev (random or chosen alias), no badge.
  const sendAsDev = useCallback(async () => {
    const t = chatText.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ text: t, name: chatName.trim() }),
      });
      if (res.ok) {
        setChatText(""); // keep the name so the persona can carry the conversation
        load(token);
      } else {
        setError((await res.json().catch(() => ({}))).message ?? "Could not send.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setPosting(false);
    }
  }, [chatText, chatName, posting, token, load]);

  // Remove any campfire message by id (moderation).
  const deleteMsg = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/admin/chat", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-admin-token": token },
          body: JSON.stringify({ id }),
        });
        if (res.ok) load(token);
      } catch {
        setError("Network error.");
      }
    },
    [token, load],
  );

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="glass w-full max-w-sm rounded-2xl p-6">
          <h1 className="text-xl font-bold text-white">🔒 VibeKilled Admin</h1>
          <p className="mt-1 text-sm text-white/50">Enter the admin token.</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="ADMIN_TOKEN"
            className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-electric/50 focus:outline-none"
          />
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
          <button onClick={submit} className="mt-4 w-full rounded-xl bg-electric/20 py-2.5 text-sm font-bold text-electric hover:bg-electric/30">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  const providers = Object.entries(data?.providers ?? {}).sort((a, b) => b[1] - a[1]);
  const countries = Object.entries(data?.countries ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const days = Object.entries(data?.days ?? {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const maxDay = Math.max(1, ...days.map(([, v]) => v));

  return (
    <div className="h-screen overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-white">VibeKilled <span className="text-coral">Admin</span></h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">{loading ? "refreshing…" : "live · 10s"}</span>
            <button onClick={logout} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/50 hover:text-white/80">
              Log out
            </button>
          </div>
        </div>
        {error && <p className="mb-4 text-sm text-coral">{error}</p>}

        {/* Top metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <Metric label="👀 online now" value={data?.online ?? 0} color="text-emerald-400" />
          <Metric label="🔥 around the fire" value={data?.liveInChat ?? 0} color="text-ember" />
          <Metric label="👥 total devs" value={data?.totalUsers ?? 0} color="text-electric" />
          <Metric label="☠ kills" value={data?.kills ?? 0} color="text-coral" />
          <Metric label="⏳ down now" value={data?.active ?? 0} color="text-ember" />
          <Metric label="✨ revived" value={data?.resurrections ?? 0} color="text-gold" />
          <Metric label="🎮 tetris plays" value={data?.tetrisPlays ?? 0} color="text-ember" />
          <Metric label="🏆 tetris high" value={data?.tetrisHigh ?? 0} color="text-gold" />
        </div>

        {/* Prominent live activity (journey) */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card title="🌊 Live activity · the journey">
            <div className="vk-scroll max-h-80 space-y-1 overflow-y-auto pr-1">
              {data?.events?.map((e) => {
                const m = EVENT_META[e.type];
                return (
                  <div key={e.id} className="flex items-center gap-2 border-b border-white/5 py-1.5 text-sm last:border-0">
                    <span>{m.icon}</span>
                    <span className="text-white/80">{e.name ?? "someone"}</span>
                    <span className={m.color}>{m.label}</span>
                    {e.country && <span className="text-white/30">{flagEmoji(e.country)}</span>}
                    {e.text && <span className="truncate italic text-white/40">“{e.text}”</span>}
                    <span className="ml-auto shrink-0 text-xs text-white/25">{rel(e.at)}</span>
                  </div>
                );
              })}
              {!data?.events?.length && <Empty />}
            </div>
          </Card>

          <Card title="🔥 Campfire · seed as a dev">
            <div className="vk-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
              {[...(data?.chat ?? [])].reverse().map((m) => (
                <div key={m.id} className="group flex items-start gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white/70">{m.name}</span>
                    {m.staff && (
                      <span
                        title="Posted by you — invisible to visitors"
                        className="ml-1.5 rounded bg-electric/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-electric"
                      >
                        you
                      </span>
                    )}
                    <span className="ml-2 text-xs text-white/25">{rel(m.at)}</span>
                    <p className="break-words text-white/85">{m.text}</p>
                  </div>
                  <button
                    onClick={() => deleteMsg(m.id)}
                    title="Delete message"
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-white/25 opacity-0 transition hover:bg-coral/15 hover:text-coral group-hover:opacity-100"
                  >
                    🗑
                  </button>
                </div>
              ))}
              {!data?.chat?.length && <Empty />}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
              <div className="flex gap-1.5">
                <input
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value.slice(0, 40))}
                  placeholder="alias (blank = random)"
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-electric/50 focus:outline-none"
                />
                <button
                  onClick={() => setChatName(devName())}
                  title="Roll a random alias"
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-sm transition hover:bg-white/5"
                >
                  🎲
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value.slice(0, 200))}
                  onKeyDown={(e) => e.key === "Enter" && sendAsDev()}
                  placeholder={`Message as ${chatName.trim() || "a random dev"}…`}
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-ember/50 focus:outline-none"
                />
                <button
                  onClick={sendAsDev}
                  disabled={posting || !chatText.trim()}
                  className="rounded-lg bg-ember/20 px-3 py-2 text-sm font-bold text-ember transition hover:bg-ember/30 disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Providers */}
          <Card title="Kills by agent">
            {providers.map(([id, n]) => {
              const p = provider(id);
              const max = Math.max(1, ...providers.map(([, v]) => v));
              return (
                <div key={id} className="mb-2">
                  <div className="mb-1 flex justify-between text-sm text-white/70">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.glow }} />
                      {p.label}
                    </span>
                    <span className="font-mono">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: p.glow }} />
                  </div>
                </div>
              );
            })}
            {!providers.length && <Empty />}
          </Card>

          {/* Countries */}
          <Card title="Top countries">
            <div className="grid grid-cols-2 gap-2">
              {countries.map(([cc, n]) => (
                <div key={cc} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span>{flagEmoji(cc)} {cc}</span>
                  <span className="font-mono text-white/70">{n}</span>
                </div>
              ))}
            </div>
            {!countries.length && <Empty />}
          </Card>

          {/* Daily kills */}
          <Card title="Kills · last 14 days">
            <div className="flex h-32 items-end gap-1">
              {days.map(([d, v]) => (
                <div key={d} className="flex flex-1 flex-col items-center justify-end" title={`${d}: ${v}`}>
                  <div className="w-full rounded-t bg-coral/70" style={{ height: `${(v / maxDay) * 100}%` }} />
                  <span className="mt-1 text-[8px] text-white/30">{d.slice(5)}</span>
                </div>
              ))}
            </div>
            {!days.length && <Empty />}
          </Card>

          {/* Leaderboard */}
          <Card title="Vibe Kings">
            {data?.leaderboard?.map((r) => (
              <div key={r.rank} className="flex items-center gap-3 border-b border-white/5 py-1.5 text-sm last:border-0">
                <span className="w-5 text-white/40">{r.rank}</span>
                <span className="flex-1 truncate text-white/80">{r.name}</span>
                <span className="text-white/40">💛 {r.good4u} · 🫂 {r.sympathy}</span>
                <span className="w-10 text-right font-mono text-electric">{r.score}</span>
              </div>
            ))}
            {!data?.leaderboard?.length && <Empty />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div className={`font-mono text-3xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-white/45">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-center text-sm text-white/30">No data yet.</p>;
}

function rel(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}
