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
npm run db:seed             # staff + demo accounts, departments, clubs
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
| `db:seed` | Run `prisma/seed.ts` (idempotent) |
| `test` / `test:watch` | Vitest unit tests (`tests/unit`, fake env, no DB or network) |
| `db:studio` | Prisma Studio |

> **Prisma 7 note:** connection URLs are not in `schema.prisma`. The CLI reads `DIRECT_URL` from `prisma.config.ts`, and the app connects with the pooled `DATABASE_URL` in `src/lib/prisma.ts`.

## Seed and demo credentials

Run `npm run db:seed`. It is idempotent and safe to re-run. It creates:

| Account | Role | Credentials from |
| --- | --- | --- |
| Super admin | `SUPER_ADMIN` | `ADMIN1_EMAIL` / `ADMIN1_PASSWORD` |
| Admin | `ADMIN` | `ADMIN2_EMAIL` / `ADMIN2_PASSWORD` |
| Club admin (admin of *CU Computer Club*) | `CLUB_ADMIN` | `ADMIN3_EMAIL` / `ADMIN3_PASSWORD` |
| Moderator | `MODERATOR` | `ADMIN4_EMAIL` / `ADMIN4_PASSWORD` |
| Demo student (CSE, batch 58) | `USER` | `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` |
| Demo student 2 (BBA, batch 60) | `USER` | `DEMO_USER_EMAIL` with `+2` added before the `@`, same password |

- All seeded accounts are pre-verified, and their passwords must pass the password policy or the seed stops with a clear error.
- **A re-run never overwrites a password.** Passwords are set only when an account is first created.
- The seed also creates 9 departments (CSE, EEE, CE, TE, BBA, ENG, BAN, JMC, LAW) and 12 clubs.
- Credentials are never committed to the repository.

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
| `UNSUPPORTED_MEDIA_TYPE` | 415 |
| `RATE_LIMITED` | 429 (with `Retry-After`) |
| `INTERNAL_ERROR` | 500 |
| `EMAIL_DELIVERY_FAILED` | 503 (safe to retry) |

Auth-specific codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password, inactive account, or non-staff on admin login. Always the same message. |
| `EMAIL_NOT_VERIFIED` | 403 | Correct credentials, but the email is not verified yet. A fresh OTP is sent. |
| `INVALID_OTP` | 400 | Wrong, unknown or already-used code. |
| `OTP_EXPIRED` | 400 | The code is older than 10 minutes. |
| `OTP_ATTEMPTS_EXCEEDED` | 400 | 5 wrong guesses. Request a new code. |
| `INVALID_CURRENT_PASSWORD` | 400 | The current password is wrong when changing password. |

Every response includes an `x-request-id` header.

### Conventions

- **Auth:** an httpOnly cookie `campusos_session` holds an HS256 JWT with claims `sub`, `role` and `tokenVersion`. On every protected request the server re-checks that the account is active and verified and that `tokenVersion` matches the database.
- **Mutating requests** (`POST`/`PATCH`/`DELETE`):
  - Must send an `Origin` (or `Referer`) header equal to the app origin, which browsers do automatically. Otherwise the response is `403 FORBIDDEN`.
  - Must use `Content-Type: application/json`. Otherwise `415`.
  - The body is limited to 16 KB. Otherwise `413`.
  - Validation is strict: unknown fields are rejected with `400 VALIDATION_ERROR`, which blocks mass assignment such as sending `"role"`.
- **Public forms** (signup, forgot-password, login) accept these anti-bot fields:
  - `website`: a honeypot that must stay empty. If filled, the server returns a fake success and does nothing.
  - `formToken`: from `GET /api/security/form-token`. Required on signup and forgot-password. It must be at least 2 s and at most 2 h old.
  - `turnstileToken`: required only when `TURNSTILE_SECRET_KEY` is set.
- **Password policy:** 8–72 characters, with an uppercase letter, a lowercase letter and a number, and not a common password.

#### Rate limits

| Tier | Limit | Applied to |
| --- | --- | --- |
| `authStrict` (DB) | 10 / 15 min per IP per endpoint | signup, verify-email, resend-otp, login, admin login, forgot/reset password, change-password |
| `otpPerEmail` (DB) | 5 / hour per email | OTP emails (resend, forgot-password) |
| Login lockout (DB) | 5 failures / 15 min per email+IP, then locked for 15 min | login, admin login |
| OTP resend cooldown | 60 s between codes per user and purpose | signup, resend-otp, forgot-password |
| `write` (DB) | 60 / min per IP | profile update, logout-all |
| `search` (DB) | 30 / min per IP | search and chatbot (later tasks) |
| `publicRead` (memory) | 300 / min per IP per instance | form-token, public reads |

### Auth flow

```
SIGN-UP
  GET  /api/security/form-token ──► { formToken }               (wait ≥ 2 s, user fills form)
  POST /api/auth/signup ──► user (isEmailVerified=false) ──► OTP (HMAC hash, 10 min, 5 tries) ──► Brevo email
  POST /api/auth/verify-email {email, code} ──► verified ──► Set-Cookie campusos_session ──► welcome email (async)

LOGIN                                 lockout check (email+IP) ─► 429 if locked
  POST /api/auth/login ──► bcrypt compare (dummy hash if no user) ──┬─ wrong   ─► 401 INVALID_CREDENTIALS (+1 failure)
                                                                     ├─ unverified ─► 403 EMAIL_NOT_VERIFIED (+ fresh OTP)
                                                                     └─ ok      ─► Set-Cookie, failures cleared
  POST /api/auth/admin/login ─── same, but non-staff roles ─► 401 INVALID_CREDENTIALS

EVERY PROTECTED REQUEST
  proxy.ts: verify JWT (no DB) ─► redirect /login | /admin/login, or 401/403 JSON for /api/admin/*
  route handler: requireAuth() ─► JWT + DB (isActive, verified, tokenVersion == claim), memoised per request

PASSWORD RESET
  POST /api/auth/forgot-password ─► always the same 200; if the account exists, OTP sent after the response
  POST /api/auth/reset-password {email, code, newPassword} ─► new hash, tokenVersion++ (all sessions revoked),
                                                              other OTPs invalidated, "password changed" email

SESSION REVOCATION
  change-password ─► tokenVersion++ ; this device gets a new cookie, all others are signed out
  logout-all      ─► tokenVersion++ ; cookie cleared
  logout          ─► cookie cleared (this device only)
```

### Endpoints

#### `GET /api/security/form-token`

Issues a signed timestamp for the minimum-time-to-submit check.

- **Auth:** none. **Rate limit:** `publicRead`. **Headers:** none.
- **Success (200),** sent with `Cache-Control: no-store`:

```json
{ "success": true, "data": { "formToken": "1791390191397.1kHGzOc_F8asELToripCPQ6VDQ4qlFxaPTSpLqQjIIM", "minAgeSeconds": 2, "maxAgeSeconds": 7200 } }
```

- **Errors:** 429 `RATE_LIMITED`.

#### `POST /api/auth/signup`

Creates an unverified account and emails a 6-digit OTP. Re-submitting for an email that is still unverified updates the pending account and re-sends the code, so a failed email can be retried.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict` per IP.
- **Body:** `studentId`, `department` (a department code such as `CSE`, `EEE`, `BBA`) and `batch` are optional.

```json
{
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "password": "Campus2026x",
  "studentId": "CU-221-15-001",
  "department": "CSE",
  "batch": "59",
  "formToken": "<from /api/security/form-token>",
  "website": ""
}
```

- **Success (201):**

```json
{ "success": true, "data": { "message": "Account created. Enter the 6-digit code we sent to your email.", "email": "rahim@example.com", "otpExpiresInSeconds": 600, "resendCooldownSeconds": 60, "resendAvailableInSeconds": 60 } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Bad fields, weak or common password, unknown keys, unknown department |
| 400 | `BAD_REQUEST` | Missing, expired or too-fast `formToken`, or malformed JSON |
| 403 | `FORBIDDEN` | Bad Origin, or Turnstile failed |
| 409 | `CONFLICT` | The email is already verified, or the `studentId` is taken |
| 413 / 415 | | Body too large / not JSON |
| 429 | `RATE_LIMITED` | Rate limit hit |
| 503 | `EMAIL_DELIVERY_FAILED` | Brevo is unreachable. The account is kept. Retry signup or call resend-otp. |

#### `POST /api/auth/verify-email`

Verifies the signup OTP and signs the user in.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`.
- **Body:**

```json
{ "email": "rahim@example.com", "code": "246810" }
```

- **Success (200):** sets the `campusos_session` cookie.

```json
{ "success": true, "data": { "message": "Email verified. You're now signed in.", "user": { "id": "cmuy…", "name": "Rahim Uddin", "email": "rahim@example.com", "role": "USER", "studentId": "CU-221-15-001", "batch": "59", "phone": null, "avatarUrl": null, "isEmailVerified": true, "createdAt": "2026-10-07T16:23:40.017Z", "department": { "id": "cmuy…", "code": "CSE", "name": "Computer Science & Engineering" } } } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_OTP` | Wrong or used code, unknown email, or account already verified |
| 400 | `OTP_EXPIRED` | Code expired |
| 400 | `OTP_ATTEMPTS_EXCEEDED` | 5 wrong guesses |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/auth/resend-otp`

Sends a new code. Earlier codes for the same purpose stop working once the new one is delivered.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict` per IP, plus `otpPerEmail` and a 60 s cooldown.
- **Body:** `purpose` is `SIGNUP_VERIFY` or `PASSWORD_RESET`.

```json
{ "email": "rahim@example.com", "purpose": "SIGNUP_VERIFY" }
```

- **Success (200):** the same response whether or not anything was sent.

```json
{ "success": true, "data": { "message": "If this email needs a code, a new one has been sent.", "otpExpiresInSeconds": 600, "resendCooldownSeconds": 60 } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 429 | `RATE_LIMITED` | Cooldown active (`Retry-After` = seconds left) or per-email cap reached |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin |
| 503 | `EMAIL_DELIVERY_FAILED` | Brevo unreachable |

#### `POST /api/auth/login`

Signs a user in with email and password.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`, plus the login lockout.
- **Body:**

```json
{ "email": "rahim@example.com", "password": "Campus2026x", "website": "" }
```

- **Success (200):** sets the `campusos_session` cookie.

```json
{ "success": true, "data": { "message": "Signed in.", "user": { "id": "cmuy…", "name": "Rahim Uddin", "email": "rahim@example.com", "role": "USER", "...": "same shape as verify-email" } } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 401 | `INVALID_CREDENTIALS` | Any credential problem, always the same message |
| 403 | `EMAIL_NOT_VERIFIED` | Correct password, but the email is not verified. A new OTP is sent. |
| 429 | `RATE_LIMITED` | Locked out (`Retry-After` up to 900) or IP limit hit |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin |

#### `POST /api/auth/admin/login`

The same as `/api/auth/login`, but only MODERATOR, CLUB_ADMIN, ADMIN and SUPER_ADMIN may sign in. Students get the generic `401 INVALID_CREDENTIALS`. A successful login writes an `auth.admin_login` row to the audit log. The request and response bodies have the same shape as login.

#### `POST /api/auth/forgot-password`

Starts a password reset.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict` per IP; `otpPerEmail` is applied silently.
- **Body:**

```json
{ "email": "rahim@example.com", "formToken": "<token>", "website": "" }
```

- **Success (200):** always identical. The lookup and email happen after the response is sent, so neither the response nor its timing reveals whether the account exists.

```json
{ "success": true, "data": { "message": "If an account exists for this email, we've sent a password reset code.", "otpExpiresInSeconds": 600 } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Bad or too-fast `formToken` |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin, or Turnstile failed |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/auth/reset-password`

Sets a new password using the reset code.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`.
- **Body:**

```json
{ "email": "rahim@example.com", "code": "135790", "newPassword": "Campus2028z" }
```

- **Success (200):** clears the session cookie. All sessions are revoked, other codes are invalidated, and a "password changed" email is sent.

```json
{ "success": true, "data": { "message": "Password updated. Please sign in with your new password." } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_OTP` / `OTP_EXPIRED` / `OTP_ATTEMPTS_EXCEEDED` | Code problem |
| 400 | `VALIDATION_ERROR` | Weak password or bad fields |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/auth/logout`

Signs out this device only.

- **Auth:** none required. **Headers:** `Origin`. **Body:** none.
- **Success (200):** sends `Set-Cookie: campusos_session=; Max-Age=0`.

```json
{ "success": true, "data": { "message": "Signed out." } }
```

- **Errors:** 403 `FORBIDDEN` (bad Origin).

#### `POST /api/auth/logout-all`

Signs out every device by incrementing `tokenVersion`.

- **Auth:** cookie. **Headers:** `Origin`. **Rate limit:** `write`. **Body:** none.
- **Success (200):** clears the cookie.

```json
{ "success": true, "data": { "message": "Signed out on all devices." } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Not signed in |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `GET /api/auth/me`

Returns the signed-in user.

- **Auth:** cookie. **Headers:** none.
- **Success (200),** sent with `Cache-Control: private, no-store`:

```json
{ "success": true, "data": { "user": { "id": "cmuy…", "name": "Rahim Uddin", "email": "rahim@example.com", "role": "USER", "studentId": "CU-221-15-001", "batch": "59", "phone": null, "avatarUrl": null, "isEmailVerified": true, "createdAt": "2026-10-07T16:23:40.017Z", "department": { "id": "cmuy…", "code": "CSE", "name": "Computer Science & Engineering" } } } }
```

- **Errors:** 401 `UNAUTHORIZED` (no cookie; or an expired, revoked or deactivated session).

#### `PATCH /api/users/me`

Updates the signed-in user's profile.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `write`.
- **Body:** every field is optional, and `null` clears it. `name`, `studentId`, `department` (code), `batch` and `phone` are allowed. Role, email and verification status cannot be changed here.

```json
{ "name": "Rahim Uddin", "phone": "+8801711000000", "department": "EEE" }
```

- **Success (200):**

```json
{ "success": true, "data": { "user": { "id": "cmuy…", "name": "Rahim Uddin", "phone": "+8801711000000", "department": { "code": "EEE", "name": "Electrical & Electronic Engineering", "id": "cmuy…" }, "...": "full profile" } } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Unknown keys, unknown department, or empty body |
| 401 | `UNAUTHORIZED` | Not signed in |
| 403 | `FORBIDDEN` | Bad Origin |
| 409 | `CONFLICT` | `studentId` is taken |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/users/me/change-password`

Changes the password and signs out every other device.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`.
- **Body:**

```json
{ "currentPassword": "Campus2026x", "newPassword": "Campus2027y" }
```

- **Success (200):** this device receives a fresh cookie, other devices are signed out, and a "password changed" email is sent.

```json
{ "success": true, "data": { "message": "Password changed. Other devices have been signed out." } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_CURRENT_PASSWORD` | Current password is wrong |
| 400 | `VALIDATION_ERROR` | Weak password, or same as the current one |
| 401 | `UNAUTHORIZED` | Not signed in |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### Protected route prefixes (`src/proxy.ts`)

| Path | No/invalid session | Signed in, not staff |
| --- | --- | --- |
| `/admin/*` (except `/admin/login`) | 307 → `/admin/login?next=…` | 307 → `/admin/login?next=…` |
| `/api/admin/*` | 401 `UNAUTHORIZED` (JSON) | 403 `FORBIDDEN` (JSON) |
| `/dashboard/*`, `/profile/*`, `/settings/*`, `/my/*`, `/notifications/*` | 307 → `/login?next=…` | allowed |

The proxy only verifies the JWT. Route handlers repeat the full check against the database.

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
   **Brevo:** if *Security → Authorised IPs* is enabled, Brevo rejects API calls from unlisted IPs with 401. Serverless hosts like Vercel have no fixed IP, so either disable that restriction or route email through a fixed-IP egress.
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
  lib/auth/                     # session JWT, RBAC, password policy, OTP primitives (pure)
  proxy.ts                      # Next 16 proxy (ex-middleware): JWT-only route protection
  server/
    services/                   # auth, user, otp, email (Brevo), audit
    repositories/               # Prisma queries with safe selects
    validators/                 # strict Zod schemas
    middleware/                 # requireAuth/Role, rate limits, request & bot guards, cookies
    security/                   # rate-limiter core, client IP, form-timing token
    email/                      # branded email layout + templates
  types/                        # shared types (API envelope)
tests/unit/                     # vitest unit tests
```
