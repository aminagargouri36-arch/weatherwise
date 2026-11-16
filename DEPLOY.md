# WeatherWise — Deployment & Device Testing Guide

## Architecture

```
┌────────────────────────────┐        HTTPS         ┌───────────────────────────────┐
│  Installable mobile app     │  ─────────────────▶ │  Backend API (Next.js routes)  │
│  (PWA: standalone, offline  │                     │  /api/weather  (weather proxy) │
│   shell, Web Push client,   │                     │  /api/geo/*    (geocoding)     │
│   GPS, EN/FR/AR + RTL UI)   │                     │  /api/preferences /api/push/*  │
└────────────────────────────┘                     │  /api/cron/weather-check       │
                                                   └───────┬───────────────┬────────┘
                                                           │               │
                                              ┌────────────▼───┐   ┌───────▼─────────┐
                                              │  PostgreSQL     │   │  Web Push (VAPID)│
                                              │  users, cities, │   │  real alerts to  │
                                              │  push tokens,   │   │  closed devices  │
                                              │  snapshots, log │   └─────────────────┘
                                              └─────────────────┘
```

- **Weather provider:** Open-Meteo (free, no key). All calls are server-side in
  `src/lib/weather.ts` — swap in a keyed provider there without touching the app.
- **Clothing engine:** transparent rule engine in `src/lib/recommend.ts`
  (temperature band → layers; precipitation envelope → rain gear; wind/UV/swing
  modifiers). Every choice ships with a translated human reason.
- **Weather watcher:** `src/lib/watcher.ts`, triggered by
  `POST/GET /api/cron/weather-check`. Diffs new forecasts against stored
  snapshots (≥3 °C shift, precipitation crossing 40 %, wet↔dry flips, morning
  briefing) and sends localized Web Push with database-level dedupe. Works while
  the app is closed — nothing depends on mobile background execution.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | no* | Web Push identity. Generate: `npx web-push generate-vapid-keys`. If absent, a pair is generated once and stored in the DB. |
| `VAPID_SUBJECT` | no | `mailto:` contact for push services |
| `CRON_SECRET` | recommended in prod | Bearer secret protecting the watcher endpoint |

## Scheduler (weather monitoring while the app is closed)

Pick one:

1. **Vercel Cron** — `vercel.json` already schedules `/api/cron/weather-check`
   every 30 minutes (adjust to `0 6 * * *` on Hobby plans). Vercel sends
   `x-vercel-cron: 1`, which the route accepts.
2. **cron-job.org / GitHub Actions / systemd** — hit every 20–30 min:

   ```bash
   curl -X POST https://YOUR_DOMAIN/api/cron/weather-check \
        -H "Authorization: Bearer $CRON_SECRET"
   ```

The route reports `{ checked, notified, errors }` for observability.

## Ship it

```bash
npm install
npx drizzle-kit push        # create tables
npm run build
npm start                   # or deploy to Vercel/any Node host
```

## Install & test on real devices

- **Android (Chrome):** open the HTTPS URL → menu → *Install app* (or tap the
  Install button in Settings). Push works in-browser or installed.
- **iPhone (iOS 16.4+):** Safari → Share → *Add to Home Screen* → open from the
  home-screen icon → Settings → enable *Weather alerts* (iOS delivers Web Push
  only to home-screen-installed apps).
- **Test matrix:** grant/deny GPS (manual-city fallback), toggle EN/FR/AR
  (immediate full-RTL flip), force-close the app, run the cron curl command
  twice (second run must dedupe), change morning hour, disable alerts,
  "Delete my data" and re-bootstrap.

## Native store distribution (optional wrap)

The app is store-ready as a PWA wrapper:
- **Google Play:** package with Bubblewrap (Trusted Web Activity) → `.aab`.
- **App Store:** wrap with PWABuilder's iOS target (WKWebView + push via
  the PWA path). Asset sizes for store listings: export 192/512 px PNGs and a
  1024 px Apple icon from `public/icons/icon-512.png`.
- If a React Native rewrite is required later, every screen maps 1:1 to Expo
  routes and the entire API contract (`/api/*`) is already device-agnostic.
