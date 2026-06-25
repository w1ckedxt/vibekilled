# VibeKilled.rip — Dev Down Detector

> Misery-loves-company hub voor developers die de rate-limit-muur raken.
> Even samenkomen achter de muur, en weer door. 💀🔥

---

## STATUS — 25 jun 2026
🟢 **LIVE** op https://vibekilled.rip (+ vibekilled.vercel.app)
Volledige feature-set draait in productie. Git gesynced & gepusht.

## ACTIVE WORK / NEXT
- [ ] Campfire-in-popup op mobiel finetunen (Leaflet popup + toetsenbord)
- [ ] Evt. chat als mobiele sheet i.p.v. in de map-popup
- [ ] Vercel WAF/BotID bij echte traffic-piek
- [ ] Aparte test-database (nu deelt lokaal de prod-Redis)

## STACK
| Laag | Keuze |
|------|-------|
| Framework | Next.js 16 (App Router) + TS |
| Styling | Tailwind v4 — "Deep Space" dark theme |
| Map | react-leaflet + CartoDB dark tiles (gratis, geen key) |
| Database | **Upstash Redis** (Vercel Marketplace) — géén Supabase |
| Data | TanStack Query (polling) |
| State | localStorage (geen accounts) |
| Deploy | Vercel, **manueel via `vercel --prod`** (geen GitHub auto-deploy) |

## FEATURES (af)
- Kaart met 💀/🎆 emoji-markers, death-burst + vuurwerk, zoom-to-area + Global View, provider-filter
- Kill-flow + privacy-jitter + last words (gemodereerd: geen links/haat, scheldwoorden ok)
- Anti-abuse: 1 actieve pin/user + 3u cooldown; rate limits (kills/reacties/chat)
- Reacties: Sympathy (down) / Good4U (resurrected) / 🤝 handshake; spectaculaire links-FX
- **Campfire of Hope**: chat vast aan je pin-kaartje, alleen tijdens timer, alleen vanaf join, "X warming up"
- **Medals** (30+, klik=bubbel, Share position), **Vibe Kings** leaderboard, **Globe of Pain** feed (max 50)
- **Admin** (`/admin`): online/live-in-chat, totals, providers, landen, grafiek, journey-feed, chat-monitor
- Responsive (inklapbare mobiele sheet), 💀 favicon, "powered by CynicalSally"

## ENV (Vercel + .env.local)
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Upstash, auto via Marketplace)
- `ADMIN_TOKEN` (admin login) — in Vercel (prod/dev) + .env.local
- `VIBEKILLED_DEV=1` / `NEXT_PUBLIC_VK_DEV=1` — **alleen lokaal** (.env.local), bypass lock + reset-knop

## ARCHITECTUUR (kort)
- `src/lib/store.ts` — alle Redis-ops (pins=hash+TTL, zset-index self-prune, feed/chat/events lists, counters, leaderboard, presence)
- `src/lib/moderation.ts` — links strippen + haatspeech weigeren
- `src/lib/achievements.ts` — medals over meerdere metrics
- API: `/api/pins`(+`/[id]`,`/react`), `/feed`, `/stats`, `/leaderboard`, `/me`, `/chat`(+`/join`), `/presence`, `/admin/stats`

## ARCHIEF
- 25 jun 2026: van 0 → volledige live hub gebouwd (zie `/plan/session-2026-06-25.md`)
