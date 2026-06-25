"use client";

import { useEffect, useRef, useState } from "react";

// Animated number that tweens to its new value and flashes when it climbs —
// the satisfying "wow it's going up" feel for the gamified stats.
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [pop, setPop] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    if (to > from) {
      setPop(true);
      const p = setTimeout(() => setPop(false), 500);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      p;
    }
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={`${className} ${pop ? "vk-pop-num" : ""} inline-block`}>{display.toLocaleString()}</span>;
}
