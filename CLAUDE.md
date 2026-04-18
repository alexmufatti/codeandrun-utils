# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (includes NODE_OPTIONS for IPv4 DNS)
npm run build    # Production build
npm run start    # Start production server

./deploy.sh      # Build Docker image locally and deploy to remote server via SSH
```

No test runner or linter is configured.

## Architecture Overview

Runner utility app (weight tracking, pace calculator, VDOT training zones) with Google OAuth authentication.

### Auth Split (Critical)

Auth is intentionally split into two files due to Edge Runtime restrictions:

- **`auth.config.ts`** — Edge-safe config (Google provider, JWT strategy, `authorized` callback). Used only by `proxy.ts`.
- **`lib/auth.ts`** — Node.js-only config (spreads `authConfig` + adds `MongoDBAdapter` + `jwt`/`session` callbacks). Used by API routes and Server Components.

**Never import `lib/auth.ts` from `proxy.ts`** — it would pull in Node.js `crypto` and break the Edge Runtime. The middleware file is named `proxy.ts` (not `middleware.ts`) for Next.js 16 compatibility.

### Session Flow

Strategy is JWT even with the MongoDB adapter — the adapter stores `users` and `accounts` collections, but sessions remain JWT tokens. User ID is propagated: `jwt` callback copies `user.id` → `token.id`, then `session` callback copies `token.id` → `session.user.id`. API routes access `session.user.id` for all data queries.

### Database

- **`lib/mongodb.ts`** — Mongoose singleton (global cache pattern) for app data
- **`lib/auth.ts`** — Also instantiates a native `MongoClient` for the NextAuth adapter
- DB name: `codeandrun-utils`, Atlas cluster
- Models (all in `models/`): `WeightEntry` (unique `{userId,date}`), `UserSettings` (`targetWeightKg`), `HrvEntry`, `RestHrEntry`, `SleepEntry`, `StravaActivity` (strict:false, stores raw Strava JSON), `StravaConnection`, `StravaUpdate` (webhook queue), `StravaEvent`, `PersonalRecord`, `EmailReportSettings`
- Dates: weight/Strava use UTC midnight `Date` objects; HRV/RestHR/Sleep use `calendarDate` string (`YYYY-MM-DD`)

### i18n

`lib/i18n/LanguageContext.tsx` provides a `useTranslations()` hook (returns `{ t, locale, setLocale }`). Locale (`it`/`en`) is persisted to `localStorage`. All UI strings live in `lib/i18n/translations.ts`. Use `interpolate(str, params)` for parameterized strings.

### Feature Modules

| Feature | Pages | Components | Lib |
|---------|-------|------------|-----|
| Weight tracker | `app/dashboard/weight/` | `components/weight/` | `lib/weight/calculations.ts` |
| Pace calculator | `app/dashboard/pace/` | `components/pace/` | `lib/pace/calculations.ts` |
| VDOT zones | `app/dashboard/vdot/` | `components/vdot/` | `lib/vdot/calculations.ts` |

Pace and VDOT features are client-only (no API/DB). Weight tracker has API routes at `app/api/weight/`.

### Styling

- Tailwind CSS v4 — uses CSS custom properties, not Tailwind class names in JS
- Chart colors use `var(--chart-1)` etc. (not string literals like `"hsl(...)`)
- shadcn/ui v3 components in `components/ui/`
- Toast notifications: `import { toast } from "sonner"` — do NOT use `useToast`
- Dark mode default via `next-themes`

### Deployment

- `next.config.ts` has `output: "standalone"` for Docker
- `deploy.sh` builds `--platform linux/amd64`, pipes image via SSH (`docker save | gzip | ssh | docker load`), then `docker compose up -d`
- Server: `/data/utils/` contains `docker-compose.yml` and `.env.local`
- Production: `apps.codeandrun.it` → reverse proxy → port 3002 → container port 3000

### Date Handling

Always use UTC when constructing date strings for chart ranges or DB queries — the API returns `YYYY-MM-DD` based on UTC midnight. Use `setUTCHours(0,0,0,0)` + `toISOString().split("T")[0]`, never `setHours` (local time).

### Garmin Sync

`garmin-sync/` — Python container that pulls Garmin data (HRV, RestHR, Sleep) and writes directly to MongoDB. Runs on a schedule; also calls `POST /api/report/send` with `x-cron-secret` header to trigger weekly email reports.

### Email Report

`lib/email/` — weekly health report (weight, HRV, RestHR, sleep, Strava runs). Settings in `models/EmailReportSettings.ts`. `POST /api/report/send` serves both cron (via `x-cron-secret: PROCESS_QUEUE_SECRET`) and authenticated UI calls. Requires env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`.

### Strava Integration

Auth is Google-primary + Strava as an optional linked account (not a NextAuth provider).

- `models/StravaConnection.ts` — stores `{ userId, athleteId, accessToken, refreshToken, expiresAt, athleteFirstname, athleteLastname }` with `userId` as unique key
- `GET /api/connect/strava` — redirects to Strava OAuth (requires active session)
- `GET /api/connect/strava/callback` — exchanges code, upserts `StravaConnection`, redirects to `/dashboard/strava`
- `DELETE /api/connect/strava/disconnect` — removes the connection
- `app/dashboard/strava/` — page showing connection status; future home for activity list

Strava access tokens expire in 6 hours. `lib/strava/getAccessToken.ts` handles automatic refresh (refreshes if expiring within 60s). Use this helper before any Strava API call.

### Required Environment Variables

```
MONGODB_URI
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL        # or trustHost: true handles reverse proxy
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_VERIFY_TOKEN     # shared secret for Strava webhook subscription verification
PROCESS_QUEUE_SECRET    # secret header for cron-triggered endpoints (/api/strava/process-queue, /api/report/send)
WP_SITE_URL             # WordPress site URL for activity publishing
WP_USERNAME
WP_APP_PASSWORD
WP_ALLOWED_USER_EMAIL   # only this email can access WP publishing features
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
SMTP_SECURE             # "true" for TLS
G_STATICMAP_KEY         # Google Static Maps API key (optional, for route maps in WP posts)
```
