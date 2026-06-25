import { ImageResponse } from "next/og";

export const alt = "VibeKilled.rip — Dev Down Detector";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic social preview card — Deep Space, on-brand provider glows.
export default function OpengraphImage() {
  const dots = [
    { c: "#d97757" }, // Claude
    { c: "#4285f4" }, // Gemini
    { c: "#10a37f" }, // GPT
    { c: "#f5f5f5" }, // Cursor
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(1000px 600px at 50% 18%, #1a1014 0%, #0a0a0a 60%)",
          color: "#e8e8ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 92, fontWeight: 800 }}>
          <span>💀</span>
          <span>
            VibeKilled<span style={{ color: "#ff5e5b" }}>.rip</span>
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 34, color: "#4cc9f0", letterSpacing: 2 }}>
          Dev Down Detector
        </div>
        <div style={{ marginTop: 26, fontSize: 28, color: "rgba(255,255,255,0.55)", maxWidth: 820, textAlign: "center" }}>
          The misery-loves-company map for developers who just hit the wall.
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 46 }}>
          {dots.map((d, i) => (
            <div
              key={i}
              style={{
                width: 26,
                height: 26,
                borderRadius: 26,
                background: d.c,
                boxShadow: `0 0 28px 6px ${d.c}`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
