# VibeKilled.rip — Dev Down Detector

> Misery-loves-company hub voor developers die de rate-limit-muur raken.
> Even samenkomen achter de muur, en weer door. 💀🔥

---

## STATUS — 30 jun 2026
🟢 **LIVE** op https://vibekilled.rip (+ vibekilled.vercel.app)
Volledige feature-set draait in productie. Git gesynced & gepusht.
Nieuw (30 jun): **durable anonieme identiteit** — server-set first-party cookie (`vk_uid`, via Next 16 `proxy.ts`) + localStorage-mirror zodat het anonieme profiel (kills/medals/score/streak) over bezoeken héén opbouwt en Safari/iOS-ITP-wissen overleeft; naam nu deterministisch uit het id.
Eerder (29 jun): **campfire host-welkom**, **grotere feed-vlaggen** (van-land→naar-land), **admin-stats echt-only** (publiek houdt de ambient-pomp), **map vliegt live naar nieuwe échte down**, en **notificatie-permission meteen bij landen**.
Eerder (28 jun): wereldwijde **ambient "down devs"**-floor (kaart altijd gevuld) + **resurrectie-notificaties** (browser-permissie ná de pin-drop).

## ACTIVE WORK / NEXT
- [x] **Durable anonieme identiteit** — `proxy.ts` zet `vk_uid` als server-cookie (~400d, sliding); `identity.ts` localStorage-first + cookie-mirror, naam deterministisch uit id. Profiel bouwt nu op over bezoeken, ITP-proof
- [x] Campfire **host-welkom** (lokaal per bezoeker, scrollt weg, weg na 30s) — geen flood bij anderen
- [x] Feed-vlaggen **groter & duidelijker** (22px + gouden van-land→naar-land pijl)
- [x] Stats: publiek houdt ambient-pomp, **admin = alleen echte cijfers** (`realActive()`)
- [x] **Map vliegt live** naar nieuwe échte down (`vk:lastkill`-signaal, ambient nooit; bot-illusie blijft intact)
- [x] **Notificatie-permission meteen bij landen** (`LandingNotify`, gesture-safe Enable, 1× per device)
- [x] Map-herhaling bij uitzoomen opgelost (minZoom 3 + noWrap + maxBounds) — bevestigd "tight"
- [x] Ambient down-devs (wereldwijde floor + lokale seeding op 1e bezoek) + arrival landt op dichtstbijzijnde kaartje — live & geverifieerd
- [x] Resurrectie-notificaties (browser-permissie ná pin-drop) — live
- [x] Schaal-fixes: caps, viewport-culling, fresh-only animaties, geen auto-follow chase — live
- [ ] Op telefoon checken: arrival-landing + feel (geen jank), ronde "I've been hit" CTA vs bottom-sheet
- [ ] Notificatie-flow live testen op echt device (permissie-kaartje ná drop + ping op recover)
- [ ] Fase 2 optie: Web Push (service worker + VAPID) voor closed-tab resurrectie-notificaties
- [ ] Campfire-in-popup op mobiel finetunen (Leaflet popup + toetsenbord)
- [ ] Evt. chat als mobiele sheet i.p.v. in de map-popup
- [ ] Vercel WAF/BotID bij echte traffic-piek
- [ ] Aparte test-database (nu deelt lokaal de prod-Redis)
- [ ] Tunen na live-gevoel: ambient floor/caps/feed-kansen in `lib/ambient.ts`

## IDEAS / ICEBOX (toekomst, geen prioriteit)
- Mini-game achter de muur tijdens je wachttijd: 🧱 **Tetris** of 🔥 **"Burn The Tokens"** (idle/clicker), naast of i.p.v. de campfire-chat.
- 🤝 **Anonymous Recovery Pacts** — tijdelijke 5-min squads van devs die nu down zijn (preset-emotes, TTL alles).
- 🟩 **Globe of Pain Bingo** — dagelijkse bingo-kaart van dev-pijn die auto-invult; voltooid = share.
- Volledige brainstorm (GPT-5.2) in `/plan/session-2026-06-26.md`. (Receipt, LOLReads, Wall Weather, Patch Notes, diagnose/eulogie → ✅ gebouwd.)

## STACK
| Laag | Keuze |
|------|-------|
| Framework | Next.js 16 (App Router) + TS |
| Styling | Tailwind v4 — "Deep Space" dark theme |
| Map | react-leaflet + CartoDB dark tiles (gratis, geen key) |
| Database | **Upstash Redis** (Vercel Marketplace) — géén Supabase |
| Data | TanStack Query (polling) |
| State | localStorage + durable `vk_uid`-cookie (server-set via `proxy.ts`); geen accounts |
| Deploy | Vercel, **manueel via `vercel --prod`** (geen GitHub auto-deploy) |

## FEATURES (af)
- Kaart met 💀/🎆 emoji-markers, death-burst + vuurwerk, zoom-to-area + Global View, **🔥 My campfire** (terug naar je pin), provider-filter
- **Begrensde wereld**: één wereld (maxBounds + noWrap, minZoom 3), geen oneindig herhalen; markers memoized + popup opent 1×/focus (geen random map-verspringen)
- **Grote ronde "I've been hit" CTA** (💀+⚔️, "rate-limited? BAM"); nieuwe kills → zachte auto-pan (uit terwijl je zelf down bent)
- Kill-flow + privacy-jitter + last words (gemodereerd: geen links/haat, scheldwoorden ok)
- **Anoniem profiel dat opbouwt**: identiteit verankerd in een server-set first-party cookie (`vk_uid`, Next 16 `proxy.ts`, ~400d sliding) + localStorage-mirror; `identity.ts` reconciliëert localStorage-first (bestaande profielen blijven) en valt terug op de cookie als localStorage gewist is (Safari/iOS ITP, private mode). Naam deterministisch uit het id, dus een wipe geeft dezelfde alias terug. Geen accounts, geen PII
- Anti-abuse: 1 actieve pin/user + 3u cooldown; rate limits (kills/reacties/chat)
- Reacties: Sympathy (down) / Good4U (resurrected) / 🤝 handshake; spectaculaire links-FX
- **Campfire of Hope**: chat vast aan je pin-kaartje, alleen tijdens timer, alleen vanaf join, "X warming up"
- **Medals** (30+, klik=bubbel, Share position), **Vibe Kings** leaderboard, **Globe of Pain** feed (max 50)
- **Admin** (`/admin`): online/live-in-chat, totals, providers, landen, grafiek, journey-feed, chat-monitor
- **Stealth admin chat**: host post als willekeurige/zelfgekozen dev-alias (geen "Sally"/badge); interne `staff`-vlag gestript uit publieke API; "you"-tag + 🎲 alias in dashboard
- Responsive (inklapbare mobiele sheet), 💀 favicon, "powered by CynicalSally"
- **Lore-laag**: deterministische absurde 🩺 diagnose + 🪦 eulogie per pin (`lib/lore.ts`), satirische live **Wall Status**-ticker, 🌱 **Touch-grass quest** per wachttijd, DROPPED-flash toont je "Cause", share-tekst draagt je diagnose
- 🧾 **Dev Down Receipt** — deelbare kassabon-PNG per pin (`next/og`, `/api/receipt/[id]`)
- 📚 **LOLReads** — 12 satirische "survive the outside" artikelen (entry → library-overlay → reader)
- 🌦️ **Wall Weather** — toggle-bare storm-overlay (CircleMarker-bins) · 📟 satirische **Patch Notes** als feed-kaarten
- 🌍 **Ambient down-devs** — wereldwijde floor (45) faked pins zodat de kaart bij binnenkomst altijd leeft (`lib/ambient.ts` + `ensureAmbientPins` in store, throttled via Redis NX-lock, gepipelined). Renderen exact als echte pins, gevarieerde recovery-tijden (20–200m, backdated) zodat het organisch voelt, maar tellen NIET in echte analytics (geen owner/leaderboard/kills/admin) — interne `ambient`-vlag lekt nooit naar de client
- 📍 **Lokale seeding + arrival** — een **echt nieuwe bezoeker** (1×/device via `takeFirstVisit`, niet bij refresh) krijgt 2–4 faked devs binnen ~50km van zichzelf (`ensureLocalAmbientPins`, eigen index, per-regio throttle 10m + **harde global cap 35**) + de kaart **landt op het dichtstbijzijnde kaartje** zodat je meteen sympathy/Good4U kunt tikken (`/api/whereami?seed=1` coarse IP-geo → `nearestPin` → focus). Prod-only (lokaal geen IP-headers)
- ⚡ **Schaal-proof map** — viewport-culling + `RENDER_CAP` (alleen on-screen markers in DOM, eigen/gefocuste pin altijd behouden); pin-animaties alléén op **verse** kills/resurrecties (statische halo default, korte self-stopping puls), backdated ambient devs komen rustig binnen (geen opening-explosie); Fireworks gecapt per update + alleen on-screen; **AutoFollowController verwijderd** (joeg de kaart weg). Houdt duizenden pins tegelijk aan.
- 🔔 **Resurrectie-notificaties** — browser-notificatie ("You're resurrected, visit VibeKilled.rip to celebrate") op het exacte recover-moment; toestemming gevraagd ná een succesvolle pin-drop (`lib/notify.ts` + `ResurrectionNotify` in SessionPanel). Precieze timer (werkt in background-tab); closed-tab vereist later Web Push

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
- 30 jun 2026: durable anonieme identiteit — server-set `vk_uid`-cookie (`proxy.ts`) + localStorage-mirror, deterministische naam; profiel overleeft Safari/iOS-ITP-wissen (zie `/plan/session-2026-06-30.md`)
- 25 jun 2026: van 0 → volledige live hub gebouwd (zie `/plan/session-2026-06-25.md`)
- 26 jun 2026: stealth admin chat, ronde kill-CTA, map random-refresh/glitch fix + begrensde wereld (zie `/plan/session-2026-06-26.md`)
