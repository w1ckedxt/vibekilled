import { ImageResponse } from "next/og";
import { getPin } from "@/lib/store";
import { provider } from "@/lib/providers";
import { diagnosis } from "@/lib/lore";

export const dynamic = "force-dynamic";

const PAPER = "#f4f1e8";
const INK = "#1a1714";
const RED = "#c0392b";

function served(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// A row on the receipt: LABEL ............ VALUE
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 26, fontWeight: bold ? 800 : 500 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Dashes() {
  return (
    <div style={{ display: "flex", width: "100%", color: "rgba(26,23,20,0.45)", fontSize: 24, overflow: "hidden", height: 22 }}>
      ----------------------------------------
    </div>
  );
}

// GET /api/receipt/:id → a shareable "Dev Down Receipt" PNG for a pin.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pin = await getPin(id);

  const size = { width: 720, height: 1040 };

  if (!pin) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: PAPER, color: INK, fontFamily: "monospace" }}>
          <div style={{ fontSize: 90 }}>🪦</div>
          <div style={{ fontSize: 34, marginTop: 16, fontWeight: 800 }}>RECEIPT EXPIRED</div>
          <div style={{ fontSize: 24, marginTop: 8, color: "rgba(26,23,20,0.6)" }}>this dev has left the wall</div>
        </div>
      ),
      size,
    );
  }

  const p = provider(pin.provider);
  const totalMin = Math.max(1, Math.round((pin.recoverAt - pin.createdAt) / 60000));
  const resurrected = pin.resurrected || pin.recoverAt <= Date.now();

  // Fake barcode — a row of bars of varying width seeded by the id.
  const bars = id.split("").map((ch, i) => ({ w: 3 + (ch.charCodeAt(0) % 7), k: i }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: PAPER,
          color: INK,
          fontFamily: "monospace",
          padding: "48px 56px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>
          <span>💀</span>
          <span>VIBEKILLED.RIP</span>
        </div>
        <div style={{ fontSize: 24, marginTop: 6, letterSpacing: 6, color: RED, fontWeight: 700 }}>
          — DEV DOWN RECEIPT —
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 36, gap: 16 }}>
          <Dashes />
          <Row label="DEV" value={pin.name} bold />
          <Row label="KILLED BY" value={p.label} />
          {typeof pin.country === "string" && pin.country ? <Row label="REGION" value={pin.country} /> : null}
          <Dashes />

          {/* Diagnosis callout */}
          <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 4 }}>
            <span style={{ fontSize: 22, color: "rgba(26,23,20,0.6)" }}>DIAGNOSIS</span>
            <span style={{ fontSize: 36, fontWeight: 800, color: RED }}>{diagnosis(pin.id)}</span>
          </div>

          <Dashes />
          <Row label="TIME SERVED" value={served(totalMin)} bold />
          <Row label="STATUS" value={resurrected ? "RESURRECTED ✨" : "STILL DOWN ⏳"} />
          <Dashes />

          {/* Support tally */}
          <Row label="SYMPATHY 🫂" value={`x${pin.sympathy}`} />
          <Row label="GOOD4U 💛" value={`x${pin.good4u}`} />
          <Row label="I-HEAR-YOUS 🤝" value={`x${pin.handshake}`} />
          <Dashes />
          <Row label="TOTAL SOLIDARITY" value={`${pin.sympathy + pin.good4u + pin.handshake}`} bold />
          <Dashes />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", marginTop: "auto", gap: 14 }}>
          <span style={{ fontSize: 22, letterSpacing: 3, color: "rgba(26,23,20,0.7)" }}>MISERY LOVES COMPANY</span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
            {bars.map((b) => (
              <div key={b.k} style={{ width: b.w, height: 60, background: INK }} />
            ))}
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>vibekilled.rip</span>
        </div>
      </div>
    ),
    size,
  );
}
