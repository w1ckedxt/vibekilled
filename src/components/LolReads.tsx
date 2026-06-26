"use client";

import { useState } from "react";
import { ARTICLES, type Article } from "@/lib/articles";

// LOLReads — satirical "how to survive outside" articles to read behind the wall.
// A compact list that opens a full reader overlay. Self-contained (own state).
export function LolReads({ title = "LOLReads", limit }: { title?: string; limit?: number }) {
  const [open, setOpen] = useState<Article | null>(null);
  const list = limit ? ARTICLES.slice(0, limit) : ARTICLES;

  return (
    <>
      <div className="glass pointer-events-auto rounded-2xl p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm leading-none">📰</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{title}</span>
          <span className="ml-auto text-[10px] text-white/30">while you wait</span>
        </div>
        <div className="space-y-0.5">
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => setOpen(a)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
            >
              <span className="text-base leading-none">{a.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white/85">{a.title}</span>
                <span className="block truncate text-[11px] text-white/40">{a.dek}</span>
              </span>
              <span className="shrink-0 text-[10px] text-white/25">{a.readMins}m</span>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[940] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
          <div className="vk-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setOpen(null)} />
          <div className="glass vk-modal-in relative z-10 flex max-h-[82vh] w-full max-w-lg flex-col rounded-t-2xl border border-white/10 p-5 sm:rounded-2xl">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl leading-none">{open.emoji}</span>
                <div>
                  <h2 className="text-lg font-extrabold leading-tight text-white">{open.title}</h2>
                  <p className="text-[12px] text-white/45">{open.dek}</p>
                </div>
              </div>
              <button onClick={() => setOpen(null)} className="shrink-0 text-xl text-white/40 hover:text-white" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="vk-scroll mt-3 space-y-3 overflow-y-auto pr-1 text-[14px] leading-relaxed text-white/80">
              {open.body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="mt-4 border-t border-white/8 pt-3 text-center text-[11px] text-white/30">
              📰 LOLReads · vibekilled.rip · not medical advice (obviously)
            </div>
          </div>
        </div>
      )}
    </>
  );
}
