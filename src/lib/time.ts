/** Format milliseconds remaining as a compact countdown, e.g. "3h 12m 04s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  if (m > 0) return `${m}m ${pad(sec)}s`;
  return `${pad(sec)}s`;
}

/** Compact "time left" for the campfire roster, e.g. "1h 12m left" / "8m left"
 *  / "<1m left". Returns "" once the timer has run out (author has resurfaced). */
export function formatLeft(ms: number): string {
  if (ms <= 0) return "";
  const m = Math.floor(ms / 60000);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m left`;
  if (m >= 1) return `${m}m left`;
  return "<1m left";
}

/** Short relative label like "2m ago" / "just now". */
export function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
