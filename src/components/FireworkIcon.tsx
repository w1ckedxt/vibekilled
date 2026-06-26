// Our own hand-drawn firework burst — replaces the 🎆 emoji for resurrections.
// Gold core + radiating rays + twinkling spark tips, gently animated. Colors are
// fixed (gold/ember/electric) so it reads as a celebration on any dark surface.
export function FireworkIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      {/* eight rays from the core */}
      <g className="vk-spark-rays" stroke="#ffd166" strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="12" x2="12" y2="4" />
        <line x1="12" y1="12" x2="12" y2="20" />
        <line x1="12" y1="12" x2="4" y2="12" />
        <line x1="12" y1="12" x2="20" y2="12" />
        <line x1="12" y1="12" x2="6.3" y2="6.3" />
        <line x1="12" y1="12" x2="17.7" y2="17.7" />
        <line x1="12" y1="12" x2="17.7" y2="6.3" />
        <line x1="12" y1="12" x2="6.3" y2="17.7" />
      </g>

      {/* spark tips — alternating warm colors, twinkling */}
      <g className="vk-spark-twinkle">
        <circle cx="12" cy="3" r="1.25" fill="#ffd166" />
        <circle cx="21" cy="12" r="1.25" fill="#ff5e5b" />
        <circle cx="12" cy="21" r="1.25" fill="#ffd166" />
        <circle cx="3" cy="12" r="1.25" fill="#4cc9f0" />
        <circle cx="5.5" cy="5.5" r="1" fill="#ff5e5b" />
        <circle cx="18.5" cy="18.5" r="1" fill="#4cc9f0" />
        <circle cx="18.5" cy="5.5" r="1" fill="#ffd166" />
        <circle cx="5.5" cy="18.5" r="1" fill="#ffd166" />
      </g>

      {/* glowing core */}
      <g className="vk-spark-core">
        <circle cx="12" cy="12" r="3.4" fill="#ffd166" opacity="0.35" />
        <circle cx="12" cy="12" r="2.1" fill="#fff3c4" />
      </g>
    </svg>
  );
}
