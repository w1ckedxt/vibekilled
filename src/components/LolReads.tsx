"use client";

import { useState } from "react";
import { ARTICLES, type Article } from "@/lib/articles";

// LOLReads — satirical "how to survive outside" articles. Presented as a single
// compact entry that opens a full library overlay (grid of reads), which in turn
// opens an individual article reader. Keeps the side panel tidy.
export function LolReads({ title = "LOLReads" }: { title?: string }) {
  const [libOpen, setLibOpen] = useState(false);
  const [current, setCurrent] = useState<Article | null>(null);

  function close() {
    setLibOpen(false);
    setCurrent(null);
  }

  return (
    <>
      {/* Compact entry — one tidy card instead of a long list */}
      <button
        onClick={() => setLibOpen(true)}
        className="glass pointer-events-auto flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[0.04]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric/10 text-xl">📰</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-white/85">{title}</span>
          <span className="block truncate text-[11px] text-white/45">
            {ARTICLES.length} absurd guides to the outside world
          </span>
        </span>
        <span className="text-lg text-white/30">›</span>
      </button>

      {libOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[940] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
          <div className="vk-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={close} />
          <div className="glass vk-modal-in relative z-10 flex max-h-[82vh] w-full max-w-lg flex-col rounded-t-2xl border border-white/10 sm:rounded-2xl">
            {current ? (
              <Reader article={current} onBack={() => setCurrent(null)} onClose={close} />
            ) : (
              <Library onPick={setCurrent} onClose={close} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Library({ onPick, onClose }: { onPick: (a: Article) => void; onClose: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <span className="text-lg">📰</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold leading-tight text-white">LOLReads</h2>
          <p className="text-[11px] text-white/45">how to survive outside — required reading behind the wall</p>
        </div>
        <button onClick={onClose} className="ml-auto shrink-0 text-xl text-white/40 hover:text-white" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="vk-scroll grid gap-1.5 overflow-y-auto p-2.5 sm:grid-cols-2">
        {ARTICLES.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a)}
            className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="text-xl leading-none">{a.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold leading-snug text-white/90">{a.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/45">{a.dek}</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-white/25">
                {a.readMins} min read
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function Reader({ article, onBack, onClose }: { article: Article; onBack: () => void; onClose: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <button onClick={onBack} className="shrink-0 text-[12px] font-semibold text-white/50 hover:text-white">
          ‹ All reads
        </button>
        <button onClick={onClose} className="ml-auto shrink-0 text-xl text-white/40 hover:text-white" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="vk-scroll overflow-y-auto px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none">{article.emoji}</span>
          <div>
            <h2 className="text-xl font-extrabold leading-tight text-white">{article.title}</h2>
            <p className="text-[12px] text-white/45">{article.dek}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-white/80">
          {article.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <div className="mt-5 border-t border-white/8 pt-3 text-center text-[11px] text-white/30">
          📰 LOLReads · vibekilled.rip · not medical advice (obviously)
        </div>
      </div>
    </>
  );
}
