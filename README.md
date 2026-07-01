# TITAN — Release Intelligence OS

**Bloomberg Terminal for Drops.** Automated release detection, AI scoring, and real-time alerts for high-demand releases.

## Features

- **Automatic Release Detection** — Modular source adapters (Ticketmaster, Nike SNKRS, UEFA, NFL, and more)
- **AI Priority Engine** — Hype, demand, urgency, and sellout probability scoring
- **Change Detection** — Date changes, presales, price updates, official links
- **Notification Engine** — In-app, email, Discord, and Telegram alerts
- **Watchlist Automation** — Rule-based matching (artist, brand, league, priority)
- **Calendar Automation** — Today, this week, EXTREME-only views with countdowns
- **Admin Panel** — Source management, manual scans, rescore, audit logs

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (PostgreSQL, Auth, RLS)
- **OpenAI** (AI scoring, with rule-based fallback)
- **Tailwind CSS**

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials. The app works in demo mode with mock data when Supabase is not configured.

### 3. Set up Supabase

Run the SQL migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/migrations/003_seed.sql`

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Authentication |
| `/dashboard` | Command center |
| `/dashboard/releases` | All releases with search/filters |
| `/dashboard/releases/[id]` | Release detail with AI analysis |
| `/dashboard/calendar` | Calendar views |
| `/dashboard/watchlists` | Watchlist rules |
| `/dashboard/notifications` | Notification history |
| `/dashboard/sources` | Source adapter management |
| `/dashboard/scans` | Scan job logs |
| `/dashboard/admin` | Admin panel |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/releases` | GET/POST | List/create releases |
| `/api/releases/[id]/rescore` | POST | Re-run AI scoring |
| `/api/sources/[id]/scan` | POST | Trigger source scan |
| `/api/cron/scan` | POST/GET | Cron job for all sources |
| `/api/notifications/test` | POST | Send test notification |
| `/api/watchlists/test` | POST | Test watchlist rules |

## Pipeline Architecture

```
SOURCE SCAN → PARSE → NORMALIZE → DEDUPLICATE → ENRICH
→ AI SCORE → SAVE → DETECT CHANGES → CREATE UPDATE EVENT
→ NOTIFY → ADD TO CALENDAR → LOG
```

### Services

- `SourceScannerService` — Fetches data from adapters
- `ParserService` — HTML/RSS/JSON parsing
- `NormalizerService` — Data normalization
- `DeduplicationService` — Duplicate detection
- `EnrichmentService` — Category/brand/artist inference
- `AIScoringService` — Priority scoring (OpenAI + rules)
- `ChangeDetectionService` — Field-level change tracking
- `NotificationService` — Multi-channel alerts
- `CalendarService` — Event automation
- `AuditLogService` — Action logging
- `WatchlistService` — Rule matching

## Source Adapters

Adapters implement: `fetch()` → `parse()` → `normalize()` → `validate()`

| Adapter | API Key Env | Status |
|---------|-------------|--------|
| Ticketmaster | `TICKETMASTER_API_KEY` | Mock + interface |
| Nike SNKRS | `NIKE_API_KEY` | Mock + interface |
| Adidas Confirmed | `ADIDAS_API_KEY` | Mock + interface |
| UEFA, NFL, F1 | — | Mock data |
| RSS Feeds | — | HTML/RSS parser |

## Cron Setup

Set `CRON_SECRET` and configure a cron job:

```bash
curl -X POST https://your-domain.com/api/cron/scan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

For Vercel, add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/scan", "schedule": "*/15 * * * *" }]
}
```

## Security

- Supabase Auth with RLS policies
- Service role key server-side only
- Admin role for management endpoints
- Secrets never exposed client-side
- No checkout/queue/CAPTCHA bypass — intelligence only

## Seed Data

10 sample releases included:
- Coldplay Europe Tour
- Taylor Swift Stadium Show
- Champions League Final
- Super Bowl LX
- Nike Mercurial / Phantom drops
- Adidas F50 Limited
- Jordan Travis Scott Drop
- Tomorrowland Ticket Sale
- Formula 1 Belgian GP

## Build

```bash
npm run build
npm start
```

## License

Private — TITAN Release Intelligence OS
