"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── A small, fully-playable Tetris for the Campfire ───────────────────────────
// Self-contained: a 7-bag randomizer, matrix rotation with wall kicks, a ghost
// piece, soft/hard drop, line clears, scoring + levels and game-over. Drives the
// board from a single mutable game object in a ref (no per-frame React state),
// committing a render only when something visible actually changes. Renders as a
// portal to <body> so it escapes the Leaflet popup's transform and fills the
// viewport. Calls onPlayed exactly once per session (game-over or close) so the
// admin can see a game was played, with the score reached.

const COLS = 10;
const ROWS = 20;

type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
type Matrix = number[][];
type CellColor = string | 0;
type Grid = CellColor[][];

const COLORS: Record<PieceType, string> = {
  I: "#22d3ee", // cyan
  J: "#3b82f6", // blue
  L: "#fb923c", // orange (ember-ish)
  O: "#facc15", // gold
  S: "#34d399", // emerald
  T: "#c084fc", // violet
  Z: "#fb7185", // coral
};

// Spawn shapes as small matrices (1 = filled). Rotated mathematically at runtime.
const SHAPES: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const PIECES = Object.keys(SHAPES) as PieceType[];
// Wall-kick column nudges tried when a rotation would otherwise collide.
const KICKS = [0, -1, 1, -2, 2];
const LINE_SCORE = [0, 40, 100, 300, 1200]; // × level, by lines cleared at once

interface Piece {
  type: PieceType;
  matrix: Matrix;
  x: number; // board col of the matrix's left edge
  y: number; // board row of the matrix's top edge
}

interface Game {
  grid: Grid;
  piece: Piece;
  bag: PieceType[];
  next: PieceType;
  score: number;
  lines: number;
  level: number;
  status: "ready" | "playing" | "paused" | "over";
  acc: number; // gravity accumulator (ms)
  last: number | null; // last rAF timestamp
  played: boolean; // a piece has locked → this counts as "played"
  reported: boolean; // onPlayed already fired
}

const emptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array<CellColor>(COLS).fill(0));

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  const out: Matrix = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawFromBag(g: Game): PieceType {
  if (g.bag.length === 0) g.bag = shuffle(PIECES);
  return g.bag.pop() as PieceType;
}

function firstFilledRow(m: Matrix): number {
  for (let r = 0; r < m.length; r++) if (m[r].some((v) => v)) return r;
  return 0;
}

function spawn(g: Game, type: PieceType): Piece {
  const matrix = SHAPES[type];
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: -firstFilledRow(matrix), // sit flush against the top
  };
}

function collides(grid: Grid, m: Matrix, x: number, y: number): boolean {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const br = y + r;
      const bc = x + c;
      if (bc < 0 || bc >= COLS || br >= ROWS) return true;
      if (br >= 0 && grid[br][bc] !== 0) return true;
    }
  }
  return false;
}

function lockPiece(grid: Grid, p: Piece): Grid {
  const next = grid.map((row) => row.slice());
  const color = COLORS[p.type];
  for (let r = 0; r < p.matrix.length; r++) {
    for (let c = 0; c < p.matrix[r].length; c++) {
      if (!p.matrix[r][c]) continue;
      const br = p.y + r;
      const bc = p.x + c;
      if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) next[br][bc] = color;
    }
  }
  return next;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - kept.length;
  const fresh: Grid = Array.from({ length: cleared }, () => Array<CellColor>(COLS).fill(0));
  return { grid: [...fresh, ...kept], cleared };
}

// Gravity interval shrinks with level; floored so it never gets unplayably fast.
const speedFor = (level: number) => Math.max(90, 800 - (level - 1) * 70);

function ghostDropY(grid: Grid, p: Piece): number {
  let y = p.y;
  while (!collides(grid, p.matrix, p.x, y + 1)) y++;
  return y;
}

function freshGame(): Game {
  const g: Game = {
    grid: emptyGrid(),
    piece: { type: "T", matrix: SHAPES.T, x: 0, y: 0 },
    bag: shuffle(PIECES),
    next: "T",
    score: 0,
    lines: 0,
    level: 1,
    status: "ready",
    acc: 0,
    last: null,
    played: false,
    reported: false,
  };
  g.piece = spawn(g, drawFromBag(g));
  g.next = drawFromBag(g);
  return g;
}

// Lock the active piece, clear lines, score, and spawn the next one. Returns
// true (and sets status to "over") if the new piece has nowhere to spawn — the
// boolean lets callers branch without fighting TS's status narrowing. Mutates g.
function lockAndNext(g: Game): boolean {
  g.grid = lockPiece(g.grid, g.piece);
  g.played = true;
  const { grid, cleared } = clearLines(g.grid);
  g.grid = grid;
  if (cleared > 0) {
    g.score += LINE_SCORE[cleared] * g.level;
    g.lines += cleared;
    g.level = 1 + Math.floor(g.lines / 10);
  }
  const piece = spawn(g, g.next);
  g.next = drawFromBag(g);
  if (collides(g.grid, piece.matrix, piece.x, piece.y)) {
    g.status = "over";
    return true;
  }
  g.piece = piece;
  g.acc = 0;
  return false;
}

interface Result {
  score: number;
  lines: number;
}

// The slice of the game the UI renders. Every field is replaced by a fresh
// reference whenever it changes, so a shallow snapshot is enough for React to
// diff — no deep cloning of the grid each frame.
interface View {
  grid: Grid;
  piece: Piece;
  status: Game["status"];
  score: number;
  lines: number;
  level: number;
  next: PieceType;
}

const snapshot = (g: Game): View => ({
  grid: g.grid,
  piece: g.piece,
  status: g.status,
  score: g.score,
  lines: g.lines,
  level: g.level,
  next: g.next,
});

export function Tetris({ onClose, onPlayed }: { onClose: () => void; onPlayed: (r: Result) => void }) {
  // Build the game exactly once (lazy useState init), then hand the SAME object
  // to the ref and seed the first view from it — so nothing reads the ref during
  // render, and the ref + view start perfectly in sync.
  const [initialGame] = useState(freshGame);
  const gRef = useRef<Game>(initialGame);
  const rafRef = useRef<number>(0);
  const onPlayedRef = useRef(onPlayed);
  useEffect(() => {
    onPlayedRef.current = onPlayed;
  });
  // The game lives in the ref so the rAF loop never reads stale closures; we
  // publish an immutable snapshot to state only when something visibly changes,
  // so the render tracks the latest game without per-frame churn.
  const [view, setView] = useState<View>(() => snapshot(initialGame));
  const commit = useCallback(() => setView(snapshot(gRef.current)), []);

  // Fire onPlayed at most once, only if at least one piece actually locked.
  const report = useCallback(() => {
    const g = gRef.current;
    if (!g.played || g.reported) return;
    g.reported = true;
    onPlayedRef.current({ score: g.score, lines: g.lines });
  }, []);

  // ── Game loop: timing only. Renders are committed on visible change. ──
  useEffect(() => {
    const loop = (time: number) => {
      const g = gRef.current;
      if (g.status === "playing") {
        if (g.last != null) {
          g.acc += time - g.last;
          const interval = speedFor(g.level);
          let changed = false;
          while (g.acc >= interval && g.status === "playing") {
            g.acc -= interval;
            if (collides(g.grid, g.piece.matrix, g.piece.x, g.piece.y + 1)) {
              if (lockAndNext(g)) report();
            } else {
              g.piece = { ...g.piece, y: g.piece.y + 1 };
            }
            changed = true;
          }
          if (changed) commit();
        }
        g.last = time;
      } else {
        g.last = null;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [report, commit]);

  // Quitting mid-game (resurrected, closed) still counts as a play.
  useEffect(() => () => report(), [report]);

  const start = useCallback(() => {
    gRef.current = freshGame();
    gRef.current.status = "playing";
    commit();
  }, [commit]);

  const togglePause = useCallback(() => {
    const g = gRef.current;
    if (g.status === "playing") g.status = "paused";
    else if (g.status === "paused") {
      g.status = "playing";
      g.last = null;
    }
    commit();
  }, [commit]);

  // ── Player actions (no-ops unless a game is live) ──
  const move = useCallback((dx: number) => {
    const g = gRef.current;
    if (g.status !== "playing") return;
    if (!collides(g.grid, g.piece.matrix, g.piece.x + dx, g.piece.y)) {
      g.piece = { ...g.piece, x: g.piece.x + dx };
      commit();
    }
  }, [commit]);

  const rotate = useCallback(() => {
    const g = gRef.current;
    if (g.status !== "playing") return;
    const rotated = rotateCW(g.piece.matrix);
    for (const k of KICKS) {
      if (!collides(g.grid, rotated, g.piece.x + k, g.piece.y)) {
        g.piece = { ...g.piece, matrix: rotated, x: g.piece.x + k };
        commit();
        return;
      }
    }
  }, [commit]);

  const softDrop = useCallback(() => {
    const g = gRef.current;
    if (g.status !== "playing") return;
    if (!collides(g.grid, g.piece.matrix, g.piece.x, g.piece.y + 1)) {
      g.piece = { ...g.piece, y: g.piece.y + 1 };
      g.score += 1;
      g.acc = 0;
    } else if (lockAndNext(g)) {
      report();
    }
    commit();
  }, [report, commit]);

  const hardDrop = useCallback(() => {
    const g = gRef.current;
    if (g.status !== "playing") return;
    const landing = ghostDropY(g.grid, g.piece);
    g.score += Math.max(0, landing - g.piece.y) * 2;
    g.piece = { ...g.piece, y: landing };
    if (lockAndNext(g)) report();
    commit();
  }, [report, commit]);

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); move(-1); break;
        case "ArrowRight": e.preventDefault(); move(1); break;
        case "ArrowDown": e.preventDefault(); softDrop(); break;
        case "ArrowUp": case "x": case "X": e.preventDefault(); rotate(); break;
        case " ": e.preventDefault(); if (gRef.current.status === "ready" || gRef.current.status === "over") start(); else hardDrop(); break;
        case "p": case "P": e.preventDefault(); togglePause(); break;
        case "Escape": e.preventDefault(); onClose(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, softDrop, rotate, hardDrop, start, togglePause, onClose]);

  if (typeof document === "undefined") return null;

  const { grid, piece, status, score, lines, level, next } = view;
  const showPiece = status === "playing" || status === "paused";
  const ghostY = showPiece ? ghostDropY(grid, piece) : piece.y;

  // Build the display grid: locked cells + ghost outline + active piece.
  const display: { color: CellColor; ghost: boolean }[][] = grid.map((row) =>
    row.map((color) => ({ color, ghost: false })),
  );
  if (showPiece) {
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (!piece.matrix[r][c]) continue;
        const gr = ghostY + r;
        const gc = piece.x + c;
        if (gr >= 0 && gr < ROWS && gc >= 0 && gc < COLS && display[gr][gc].color === 0) display[gr][gc].ghost = true;
      }
    }
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (!piece.matrix[r][c]) continue;
        const br = piece.y + r;
        const bc = piece.x + c;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
          display[br][bc] = { color: COLORS[piece.type], ghost: false };
        }
      }
    }
  }

  const overlay = (
    <div className="pointer-events-auto fixed inset-0 z-[950] flex items-center justify-center" role="dialog" aria-modal>
      <div className="vk-backdrop-in absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className="vk-modal-in relative z-10 flex max-h-[94vh] flex-col items-center gap-3 px-3 py-4">
        {/* Header: title + live stats + close */}
        <div className="flex w-full items-center gap-2">
          <span className="text-lg">🎮</span>
          <span className="text-[13px] font-extrabold uppercase tracking-wide text-white">Campfire Tetris</span>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/55 transition hover:bg-white/5 hover:text-white"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex w-full items-stretch gap-3">
          <StatBox label="score" value={score.toLocaleString()} accent="text-ember" />
          <StatBox label="lines" value={String(lines)} accent="text-emerald-400" />
          <StatBox label="level" value={String(level)} accent="text-electric" />
          <NextPreview type={next} />
        </div>

        {/* Board */}
        <div className="relative">
          <div
            className="grid gap-[2px] rounded-xl border border-white/10 bg-black/50 p-[3px]"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
              height: "min(64vh, 540px)",
              aspectRatio: `${COLS} / ${ROWS}`,
            }}
          >
            {display.flat().map((cell, i) => (
              <div
                key={i}
                className="rounded-[2px]"
                style={
                  cell.color
                    ? { background: cell.color, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.25), 0 0 6px ${cell.color}66` }
                    : cell.ghost
                      ? { background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }
                      : { background: "rgba(255,255,255,0.025)" }
                }
              />
            ))}
          </div>

          {/* Status veils */}
          {status !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 backdrop-blur-[2px]">
              {status === "ready" && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-white">Stack blocks.</div>
                    <div className="mt-1 text-[13px] text-white/55">Kill time while the wall holds you.</div>
                  </div>
                  <button onClick={start} className="rounded-xl bg-ember/25 px-6 py-2.5 text-sm font-bold text-ember transition hover:bg-ember/35">
                    ▶ Play
                  </button>
                </>
              )}
              {status === "paused" && (
                <>
                  <div className="text-xl font-extrabold text-white">Paused</div>
                  <button onClick={togglePause} className="rounded-xl bg-electric/20 px-6 py-2.5 text-sm font-bold text-electric transition hover:bg-electric/30">
                    Resume
                  </button>
                </>
              )}
              {status === "over" && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-coral">Game Over</div>
                    <div className="mt-1 text-[13px] text-white/65">
                      {score.toLocaleString()} points · {lines} lines
                    </div>
                  </div>
                  <button onClick={start} className="rounded-xl bg-ember/25 px-6 py-2.5 text-sm font-bold text-ember transition hover:bg-ember/35">
                    ↻ Play again
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Touch / click controls — work everywhere, not just on a phone */}
        <div className="flex w-full max-w-[320px] items-center justify-between gap-2">
          <Ctrl onClick={() => move(-1)} label="◀" />
          <Ctrl onClick={rotate} label="⟳" />
          <Ctrl onClick={softDrop} label="▼" />
          <Ctrl onClick={hardDrop} label="⤓" big />
          <Ctrl onClick={() => move(1)} label="▶" />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-white/35">
          <button onClick={togglePause} className="font-semibold text-white/45 hover:text-white/80">
            {status === "paused" ? "▶ resume" : "⏸ pause"}
          </button>
          <span className="hidden sm:inline">← → move · ↑ rotate · ↓ soft · space hard-drop</span>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-1.5">
      <div className={`font-mono text-base font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}

function NextPreview({ type }: { type: PieceType }) {
  const m = SHAPES[type];
  return (
    <div className="glass flex flex-col items-center justify-center rounded-xl px-2 py-1.5">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${m[0].length}, 9px)` }}>
        {m.flat().map((v, i) => (
          <div
            key={i}
            className="h-[9px] w-[9px] rounded-[1px]"
            style={{ background: v ? COLORS[type] : "transparent" }}
          />
        ))}
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wide text-white/40">next</div>
    </div>
  );
}

function Ctrl({ onClick, label, big }: { onClick: () => void; label: string; big?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`glass grid place-items-center rounded-xl text-xl text-white/85 transition active:scale-95 active:bg-white/10 ${
        big ? "h-14 w-16 text-2xl text-ember" : "h-14 w-14"
      }`}
      aria-label={label}
    >
      {label}
    </button>
  );
}
