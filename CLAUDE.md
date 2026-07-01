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
- Models (all in `models/`): `WeightEntry` (unique `{userId,date}`), `UserSettings` (`targetWeightKg`), `HrvEntry`, `RestHrEntry`, `SleepEntry`, `StravaActivity` (strict:false, stores raw Strava JSON), `StravaConnection`, `StravaUpdate` (webhook queue), `StravaEvent`, `PersonalRecord`, `EmailReportSettings`, `MealPlan`, `MealShare`
- Dates: weight/Strava use UTC midnight `Date` objects; HRV/RestHR/Sleep use `calendarDate` string (`YYYY-MM-DD`)

### i18n

`lib/i18n/LanguageContext.tsx` provides a `useTranslations()` hook (returns `{ t, locale, setLocale }`). Locale (`it`/`en`) is persisted to `localStorage`. All UI strings live in `lib/i18n/translations.ts`. Use `interpolate(str, params)` for parameterized strings.

### Feature Modules

| Feature | Pages | Components | Lib |
|---------|-------|------------|-----|
| Dashboard home | `app/dashboard/page.tsx` → `WeekSummaryClient` | — | `GET /api/summary/week` aggregates last-7-days weight/HRV/RestHR/sleep/Strava for one card view |
| Meal planner | `app/dashboard/meals/`, `app/meals/shared/[token]/` | `components/meals/` | `app/api/meals/` (weekly grid CRUD), `app/api/meals/share/` (issue/revoke share token) |
| Weight tracker | `app/dashboard/weight/` | `components/weight/` | `lib/weight/calculations.ts` |
| Pace calculator | `app/dashboard/pace/` | `components/pace/` | `lib/pace/calculations.ts` |
| VDOT zones | `app/dashboard/vdot/` | `components/vdot/` | `lib/vdot/calculations.ts` |

Pace and VDOT features are client-only (no API/DB). Weight tracker has API routes at `app/api/weight/`.

### Read-only Sharing (`/shared/[token]/...`)

`MealShare` doubles as the generic share-token store for the whole app, not just meals — despite the name, it gates `app/shared/[token]/{weight,sleep,hrv,resthr,pace,vdot,strava,meals,hr}` and matching `app/api/shared/[token]/*` routes. `lib/shared/validateToken.ts` validates the 48-hex-char token against `MealShare` and returns `{ userId, canWrite }`; these routes have **no session/auth check**, so token secrecy is the only access control. One share per user (`userId` is a unique index); `canWrite` only matters for the meals endpoints.

### Astro Draft Publishing

`POST /api/strava/activities/astro` generates an MDX draft (`lib/strava/astro-draft.ts`) for the Astro-based blog: builds frontmatter + `<StravaAccordion>` blocks per activity, uploads Strava route maps to S3 via `lib/s3.ts`, and stamps `astroSlug`/`astroPostUrl` on the `StravaActivity` docs. Gated by `isWordPressUser()` (`lib/wordpress-auth.ts`, checks `session.user.email === WP_ALLOWED_USER_EMAIL`) — the name is legacy from a since-removed direct-to-WordPress publish flow, but the gate itself is still the access control for this and the stats-publish route.

`scripts/migrate-images-to-webp.mjs` — one-off/rerunnable script converting existing S3-hosted images to WebP and rewriting MDX references; supports `--dry-run`.

### Media Gallery (`/dashboard/media`)

`app/api/media/` — `GET` lists everything under the `uploads/` S3 prefix (via `listImages()` in `lib/s3.ts`, newest first, capped at 300), `POST` uploads a new image. Both gated by `isWordPressUser()`. `resizeAndUploadImage()` (`lib/s3.ts`) is the shared upload path — resizes to 1200px wide and re-encodes to WebP via `sharp`, used by both this route and the Astro draft's `upload-media` route so all uploads land in the same `uploads/YYYY/MM/slug.ext` namespace and show up in the gallery.

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
WP_ALLOWED_USER_EMAIL   # only this email can access the Astro draft / stats publishing features
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
SMTP_SECURE             # "true" for TLS
G_STATICMAP_KEY         # Google Static Maps API key (optional, for route maps in Astro drafts)
AWS_ACCESS_KEY_ID       # S3 upload for Astro draft images / image migration script
AWS_SECRET_ACCESS_KEY
AWS_REGION              # default eu-south-1
S3_BUCKET               # e.g. codeandrun-wordpress
CDN_URL                 # e.g. https://cdn.codeandrun.it — prefixed onto uploaded object keys
```
