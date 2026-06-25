"use client";

import Image from "next/image";

// Small, clickable attribution that sits under the header tagline.
export function SallyBadge() {
  return (
    <a
      href="https://cynicalsally.com"
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto mt-1 inline-flex items-center gap-1.5 opacity-70 transition hover:opacity-100"
    >
      <Image
        src="/sally-face.png"
        alt="Cynical Sally"
        width={18}
        height={18}
        className="h-[18px] w-[18px] rounded-full object-cover ring-1 ring-white/15"
      />
      <span className="text-[11px] text-white/50">
        powered by <span className="font-semibold text-white/75">CynicalSally</span>
      </span>
    </a>
  );
}
