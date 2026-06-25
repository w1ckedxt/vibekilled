# VibeKilled.rip — Dev Down Detector

> Misery-loves-company map for developers who just hit the rate-limit wall.
> "ja ik had ook limiet geraakt" — de hele wereld op één kaart.

---

## STATUS — 25 jun 2026
🟢 **LIVE** op https://vibekilled.vercel.app
🌐 Custom domein `vibekilled.rip` gekoppeld aan Vercel — **wacht op DNS** (zie onder).

---

## STACK
| Laag | Keuze | Waarom |
|------|-------|--------|
| Framework | Next.js 16 (App Router) + TS | snelheid, SEO, Vercel-native |
| Styling | Tailwind v4 | Deep Space dark theme |
| Map | react-leaflet + CartoDB dark tiles | **gratis, geen API key** |
| Database | **Upstash Redis** (Vercel Marketplace) | géén Supabase; ephemeral pins = TTL, GEO, atomische counters, schaalt naar miljoenen |
| Data fetching | TanStack Query (polling) | live-genoeg, edge-cachebaar |
| State | localStorage | geen accounts, privacy-first |
| Deploy | Vercel (project `vibekilled`) | 1-click, Fluid Compute |

## ARCHITECTUUR
- **Redis-model** (`src/lib/store.ts`): pin = hash met TTL · `vk:pins` zset self-pruned op expiry · feed = capped list · counters via `HINCRBY`/`INCR` · per-user lock `vk:user:{id}:active`.
- **Privacy** (`src/lib/geo.ts`): locatie ALTIJD ge-jitterd (~12km) + afgerond (2 decimalen); land-niveau labels via Vercel IP-headers. Toggle default UIT.
- **Anti-abuse**: één actieve pin per user (server-enforced via TTL-lock = ingevulde hersteltijd).
- **Achievements** (`src/lib/achievements.ts`): server-side afgeleid van kill-count → niet te faken. 1=First One!, 2=Again? Wow, 5, 10, 25.
- **API**: `GET/POST /api/pins`, `GET /api/pins/:id`, `POST /api/pins/:id/react`, `GET /api/feed`, `GET /api/stats`.

## FEATURES (af)
- ✅ Fullscreen Deep Space wereldkaart, glow-pins per provider (Claude/Gemini/GPT/Cursor/Other)
- ✅ Kill-flow: "I've hit it :(" → provider + hersteltijd + optioneel bericht + locatie-toggle
- ✅ Resurrection: gouden canvas-vuurwerk wanneer timer 0 raakt
- ✅ Good4U + Extend Sympathy (client-side dedupe)
- ✅ Global live feed met wisselende quip-cards ("Dev Down #42 has to touch grass for 2h") + agent-badge per card
- ✅ Eigen session-panel: grote countdown + ontvangen sympathy/views + "X devs voelden je pijn"-toast + achievement-shelf
- ✅ Stats-pill (kills / down now / revived)
- ✅ Responsive: rechts-paneel op desktop, bottom-sheet op mobiel

## NEXT STEPS
- [ ] **DNS**: bij Hostnet voor `vibekilled.rip` zetten → `A @ 76.76.21.21` + `CNAME www cname.vercel-dns.com` (of nameservers naar Vercel)
- [ ] OG-image / social preview kaartje
- [ ] Provider-filter op de kaart
- [ ] Bot/rate-limit bescherming op POST (Vercel BotID / WAF) voor de echte traffic-piek

## ENV (via Upstash Marketplace integratie — automatisch gezet)
`KV_REST_API_URL`, `KV_REST_API_TOKEN` (code ondersteunt ook `UPSTASH_REDIS_REST_*`)
