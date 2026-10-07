# CampusOS: City University

One hub for campus life at City University (Bangladesh). Events and clubs, academic resources, notices, bus schedules, lost and found, complaints, and an "Ask CampusOS" assistant all live in one fast, mobile-first web app instead of being scattered across Facebook groups, Google Forms and notice boards.

> **Status:** Task 1 is done: project foundation, database schema and migrations, core libraries. The UI and API endpoints are added in later tasks.

---

## Contents

1. [Overview](#overview)
2. [Problem → solution scenarios](#problem--solution-scenarios)
3. [Modules](#modules)
4. [Tech stack](#tech-stack)
5. [Architecture](#architecture)
6. [Environment variables](#environment-variables)
7. [Local setup](#local-setup)
8. [Seed and demo credentials](#seed-and-demo-credentials)
9. [API reference](#api-reference)
10. [Caching tag map](#caching-tag-map)
11. [Security](#security)
12. [Deployment](#deployment)
13. [Folder structure](#folder-structure)

---

## Overview

CampusOS is a single Next.js application. It serves the pages and the JSON API (`/api/*`) and stores its data in Neon PostgreSQL through Prisma. Public pages are served from a tag-invalidated cache, so they load instantly from the CDN and are refreshed only when an admin or user changes the underlying data.

## Problem → solution scenarios

| Today's problem | With CampusOS |
| --- | --- |
| Event announcements get lost in Facebook groups, and registration happens through scattered Google Forms. | A single events feed with filters. One-click registration produces a QR ticket that is scanned at the door. |
| Previous question papers and notes live in random Drive links. | A searchable, moderated resource library organized by department, course and semester, with bookmarks and full-text search. |
| A class gets cancelled and half the section never sees the notice. | Categorized, pinnable notices targeted by department or course, plus in-app notifications. |
| "When does the next bus leave for Dhanmondi?" | Route and trip timetables, also answered by the assistant. |
| A lost ID card is posted once and buried. | A lost and found board with photos and claim requests that admins verify. |
| Complaints disappear, or students fear retaliation. | Ticketed complaints (`CU-2026-000123`) with status tracking and an optional anonymous mode. |
| The same questions about rules, exams and admission get asked over and over. | A knowledge-base chatbot that also logs unanswered questions so admins can fill the gaps. |
| Club forms and deadlines are spread everywhere. | A central "Forms & deadlines" listing. |

## Modules

1. **Events & Clubs:** clubs, memberships, club admins, events, registrations with QR check-in, and a central form-link listing.
2. **Academic Resources:** notes, question papers and lab manuals uploaded as PDFs. Uploads go through moderation and support full-text and fuzzy search plus bookmarks.
3. **Campus Info & Assistant:** notices, bus routes and trips, and a knowledge base with a retrieval-first chatbot.
4. **Lost & Found + Complaints:** item board with claims, and ticketed complaints with an update timeline.
5. **Platform:** auth with email OTP, roles, notifications, audit log, DB-backed rate limiting and upload tracking.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Route Handlers), React 19, TypeScript strict |
| Database | PostgreSQL on Neon, Prisma 7 with `@prisma/adapter-pg`, `pg_trgm`, tsvector full-text search |
| Validation | Zod 4 |
| Auth | `jose` (HS256 JWT in an httpOnly cookie), `bcryptjs` (cost 12), email OTP |
| Email | Brevo REST API via native `fetch` |
| Uploads | UploadThing; images compressed with `image-video-compressor` (sharp) |
| UI | Tailwind CSS 4, Framer Motion (LazyMotion), lucide-react, react-hot-toast |
| Utilities | date-fns, qrcode, nanoid, clsx + tailwind-merge |

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). It covers the layering (routes → validators → services → repositories), the API envelope, the tag-based ISR strategy, auth, uploads, search and the chatbot.

## Environment variables

Copy `.env.example` to `.env` and fill it in. `src/lib/env.ts` validates every variable at startup and fails with a list of what is missing or invalid. Values are never printed. Only `NEXT_PUBLIC_*` values reach the browser.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL; also the allowed Origin for mutations |
| `NEXT_PUBLIC_APP_NAME` | no | Display name |
| `DATABASE_URL` | yes | Neon **pooled** connection string (runtime) |
| `DIRECT_URL` | yes | Neon **direct** connection string (migrations) |
| `JWT_SECRET` | yes | ≥ 32 characters, HS256 signing key |
| `JWT_EXPIRES_IN` | yes | Session lifetime, e.g. `7d` |
| `BREVO_API_KEY` | yes | Brevo transactional email |
| `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | yes | Verified sender |
| `UPLOADTHING_TOKEN` | yes | UploadThing server token |
| `REVALIDATE_SECRET` | yes | ≥ 16 characters, guards the manual revalidation endpoint |
| `CRON_SECRET` | yes | ≥ 16 characters, guards cron endpoints |
| `LLM_API_KEY` | no | Enables grounded LLM answers in the chatbot |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no | Cloudflare Turnstile bot protection |
| `ADMIN1..4_EMAIL` / `ADMIN1..4_PASSWORD` | seed only | Admin accounts created by the seed |
| `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | seed only | Demo student account created by the seed |

## Local setup

Requirements: Node.js ≥ 20.12 (developed on 24) and a Neon (or any PostgreSQL 15+) database.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values
npm run db:deploy           # apply migrations (includes pg_trgm + full-text search)
npm run db:seed             # seed demo data (added in a later task)
npm run dev                 # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `dev` / `build` / `start` | Next.js dev server / production build (runs `prisma generate` first) / serve the build |
| `lint` | ESLint |
| `typecheck` | `next typegen` + `tsc --noEmit` |
| `db:generate` | Generate the Prisma client into `src/generated/prisma` |
| `db:migrate` | Create and apply a new migration in development (`prisma migrate dev`) |
| `db:deploy` | Apply pending migrations (`prisma migrate deploy`), for CI and production |
| `db:seed` | Run `prisma/seed.ts` |
| `db:studio` | Prisma Studio |

> **Prisma 7 note:** connection URLs are not in `schema.prisma`. The CLI reads `DIRECT_URL` from `prisma.config.ts`, and the app connects with the pooled `DATABASE_URL` in `src/lib/prisma.ts`.

## Seed and demo credentials

_Added with the seed script in a later task._ Accounts are created from the `ADMIN1..4_*` and `DEMO_USER_*` environment variables. Credentials are never committed to the repository.

## API reference

All endpoints return the standard envelope:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "nextCursor": null, "total": 0 } }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.", "details": [] } }
```

Common error codes:

| Code | Status |
| --- | --- |
| `BAD_REQUEST` | 400 |
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `PAYLOAD_TOO_LARGE` | 413 |
| `RATE_LIMITED` | 429 (with `Retry-After`) |
| `INTERNAL_ERROR` | 500 |

Every response includes an `x-request-id` header.

_No endpoints yet. Each endpoint is documented here, in the same task that adds it, with its method, path, auth, headers, request body, success response, error responses and status codes._

## Caching tag map

Public data uses `"use cache"` + `cacheLife("max")` + `cacheTag(...)`. Mutations call the helpers in `src/lib/cache-tags.ts`, which use `revalidateTag(tag, "max")`. There is no time-based revalidation.

| Tag | Covers | Invalidated by |
| --- | --- | --- |
| `events` | Event lists, upcoming events | `revalidateEvents()`, `revalidateClubs()` |
| `event:{id}` | Single event page | `revalidateEvents(id)` |
| `clubs` | Club directory | `revalidateClubs()` |
| `club:{id}` | Single club page | `revalidateClubs(id)` |
| `forms` | Forms & deadlines listing | `revalidateForms()`, `revalidateClubs()` |
| `resources` | Resource library lists and search | `revalidateResources()`, `revalidateAcademics()` |
| `resource:{id}` | Single resource page | `revalidateResources(id)` |
| `departments` / `courses` | Filters and dropdowns | `revalidateAcademics()` |
| `notices` | Notice board | `revalidateNotices()`, `revalidateAcademics()` |
| `notice:{id}` | Single notice | `revalidateNotices(id)` |
| `buses` | Routes and timetables | `revalidateBuses()` |
| `bus:{id}` | Single route | `revalidateBuses(id)` |
| `kb` | Knowledge base / FAQ pages | `revalidateKnowledgeBase()`, `revalidateBuses()` |
| `kb:{id}` | Single KB entry | `revalidateKnowledgeBase(id)` |
| `lost-found` | Lost & found board | `revalidateLostFound()` |
| `lf:{id}` | Single lost & found item | `revalidateLostFound(id)` |
| `stats` | Landing page counters | Every collection helper, `revalidateStats()` |

User-specific data (dashboards, notifications, my registrations, my complaints) is never cached.

## Security

- Zod-validated environment that fails fast. Secrets come only from `process.env`, and `.env*` is git-ignored except `.env.example`.
- bcrypt (cost 12) password hashes. Email OTPs are stored hashed, with an expiry and an attempt limit.
- JWT in an `httpOnly` cookie with `Secure` and `SameSite=Lax`. Token versioning allows revocation.
- `.strict()` Zod validation on every endpoint, an Origin check on mutations, DB-backed rate limiting, and a honeypot plus optional Turnstile on public forms.
- CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are set in `next.config.ts`.
- Uploads are checked by magic bytes and size, and images are re-encoded (stripping EXIF and polyglots).
- Generic error messages, a structured logger that redacts secrets, and an audit log for admin actions.

## Deployment

Target: Vercel (Node.js runtime) with Neon.

1. Set every variable from the table above in the hosting dashboard.
2. Build command: `npm run build`. Migrations: `npm run db:deploy`, run in CI or as a release step.
3. After the hackathon, rotate the Neon password, Brevo key, UploadThing token, JWT secret and admin passwords.

## Folder structure

```
prisma/
  schema.prisma                 # full data model
  migrations/                   # init + raw-SQL full-text search migration
prisma.config.ts                # Prisma 7 CLI config (DIRECT_URL, migrations, seed)
docs/ARCHITECTURE.md
src/
  app/
    (public)/                   # cached public pages
    (auth)/                     # login, signup, OTP, reset
    (user)/                     # signed-in student area
    admin/                      # admin console
    api/                        # Route Handlers (JSON API)
  components/{ui,layout,shared,features}
  config/public-env.ts          # browser-safe NEXT_PUBLIC_* config
  generated/prisma/             # Prisma client (generated, git-ignored)
  hooks/
  lib/                          # env, prisma, logger, errors, api-response, cache-tags
  server/{services,repositories,validators,middleware}
  types/                        # shared types (API envelope)
```
