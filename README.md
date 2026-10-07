# CampusOS: City University

One hub for campus life at City University (Bangladesh). Events and clubs, academic resources, notices, bus schedules, lost and found, complaints, and an "Ask CampusOS" assistant all live in one fast, mobile-first web app instead of being scattered across Facebook groups, Google Forms and notice boards.

> **Status:** the backend is complete: auth and security, uploads, Module 1 (Clubs & Events), Module 2 (Resource Hub), Module 3 (Smart Helpdesk & grounded chatbot), Module 4 (Lost & Found + Complaints), notices, forms, bus schedule, global search, notifications and admin analytics. The UI comes in later tasks.

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
| `LLM_API_KEY` | no | Anthropic API key. Turns on an optional rephrasing layer (Claude, 3 s budget) over knowledge-base answers. The chatbot is fully functional without it. |
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
| `uploads:cleanup` | Lists orphaned uploads older than 24 h; add `-- --apply` to delete them from UploadThing and the DB |
| `reminders:send` | Sends "event starts tomorrow" reminders (same job as `GET /api/cron/reminders`; idempotent) |
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
- The seed also creates demo content (`prisma/seed-content.ts`):
  - 9 departments (CSE, EEE, CE, TE, BBA, ENG, BAN, JMC, LAW) and 56 courses.
  - 12 clubs. The CLUB_ADMIN is the admin of *CU Computer Club*.
  - 30 events, dated relative to the seed day (Dhaka): 23 published (several this week), 4 completed, 1 cancelled and 2 drafts. *Mock Interview Day* has only 5 seats, to demo capacity limits.
  - 6 registrations for the demo students.
  - 60 resources across all departments: 55 approved, 4 pending (in the moderation queue) and 1 rejected.
- **Sample files are clearly flagged.** Every seed resource has `isSample: true` and a `sample-resource-NNN` key, and points at one real generated PDF (`campusos-sample-resource.pdf`). The seed uploads that PDF to UploadThing once and tracks it in `UploadedFile`. If the upload fails, a flagged placeholder URL is used instead.
- Event dates and the counters (`registrationCount`, sample `downloadCount`) are refreshed on each run.
- **Helpdesk & campus content** (`prisma/seed-campus.ts`):
  - **82 knowledge-base entries**, all `isSample: true` (*sample data that admins must verify*; the chatbot labels answers drawn from them). Editing an entry clears the flag.
  - 6 bus routes to the Khagan/Birulia campus with Sat–Thu trips, and their auto-generated KB entries.
  - 8 notices (two EXAM notices, auto-synced into the KB, and two class cancellations).
  - 5 open forms with **placeholder `example.com` URLs**, to be replaced with real Google Form links.
  - 6 lost & found posts by the demo students.
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

### List conventions (all modules)

- **Pagination:** `?cursor=<opaque>&limit=1..50` (default 20). Responses carry `meta: { "limit": 20, "nextCursor": "…" | null }`. Pass `nextCursor` back as `cursor` to get the next page; `null` means the last page. Cursors are keyset-based, never OFFSET. A malformed resource-search cursor returns `400 VALIDATION_ERROR`.
- **Empty query values** (`?q=`) are ignored. Unknown query parameters are rejected (`400 VALIDATION_ERROR`).
- **Ids** are Prisma cuids (`c` + 20–32 lowercase alphanumerics). A malformed id returns `400 VALIDATION_ERROR` before any database work.
- **Times** in request bodies are ISO-8601 with an offset (`2026-11-02T15:00:00+06:00`). Responses are UTC ISO strings. Campus calendar maths (week, month) uses Asia/Dhaka.

Module error codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `EVENT_NOT_OPEN` | 409 | The event is a draft, cancelled or completed |
| `EVENT_ENDED` | 409 | The event has already ended |
| `REGISTRATION_CLOSED` | 409 | Past the registration deadline (or the start time if there is no deadline) |
| `ALREADY_REGISTERED` | 409 | An active registration already exists |
| `EVENT_FULL` | 409 | Capacity is reached (checked atomically) |
| `TICKET_NOT_FOUND` | 404 | The QR token is unknown |
| `WRONG_EVENT` | 409 | The ticket belongs to another event |
| `REGISTRATION_CANCELLED` | 409 | The ticket's registration was cancelled |
| `ALREADY_CHECKED_IN` | 409 | Already checked in (`details.checkedInAt`) |
| `EVENT_NOT_ACTIVE` | 409 | Check-in at a draft or cancelled event |
| `CHECKIN_NOT_OPEN` / `CHECKIN_CLOSED` | 409 | Outside the door window (3 h before start to 3 h after end) |
| `IMAGE_PROCESSING_FAILED` | 422 | The image is corrupt or could not be compressed. The raw file is never uploaded. |
| `IMAGE_QUEUE_FULL` | 503 | The compression queue is saturated. Retry shortly. |
| `UPLOAD_FAILED` / `UPLOAD_DELETE_FAILED` | 503 | UploadThing is unavailable. Safe to retry. |

Additional rate-limit tiers: **`upload`** (DB) allows 20 per 10 min per IP for image uploads, PDF upload requests and resource submissions. **Check-in** (DB) allows 240 per minute per IP, because door scanners send requests in bursts. Event and resource search with `q` uses the `search` tier. Other public reads use `publicRead`.

### Uploads

Every file URL stored in the database must come from this pipeline. Stored URLs must be `https://<app>.ufs.sh/f/<key>` (or legacy `https://utfs.io/f/<key>`), the key must exist in `UploadedFile`, and it must belong to the caller. Admins may reuse any tracked image. Anything else is rejected with `400 VALIDATION_ERROR`, using the real field name in `details[].path` (for example `bannerUrl` or `fileUrl`).

#### `POST /api/upload/image`

Compresses an image server-side and stores it on UploadThing.

- **Auth:** cookie (any signed-in user). **Headers:** `Origin`, `Content-Type: multipart/form-data`. **Rate limit:** `upload`.
- **Form fields:**
  - `file` (required): JPEG, PNG, WebP, AVIF or GIF, at most 4 MB. The real type is checked by magic bytes, not the extension.
  - `purpose` (optional): one of `general` (default), `avatar`, `event-banner`, `club-logo`, `lost-found`, `complaint`, `resource-thumbnail`.

  ```bash
  curl -X POST /api/upload/image -H "Origin: https://app" -b cookies -F "file=@banner.jpg" -F "purpose=event-banner"
  ```
- **Pipeline:**
  1. Auth and rate limit.
  2. Magic-byte check.
  3. If the image exceeds the purpose's bounds, sharp resizes it to fit (EXIF orientation is applied, and the result is never upscaled).
  4. `image-video-compressor` compresses it (`format: "auto"`, quality 80, metadata stripped).
  5. `UTApi.uploadFiles` uploads it.
  6. An `UploadedFile` row is saved.

  The bounds per purpose are: avatar and club-logo 512², resource-thumbnail 800², event-banner 1920×1080, everything else 1600².
- **Success (201):** `url` is the value to store in `bannerUrl`, `logoUrl` and similar fields.

  ```json
  { "success": true, "data": { "url": "https://wqsc48wcpm.ufs.sh/f/oNCr…", "key": "oNCr…", "size": 18088, "originalSize": 530332, "compressionRatio": "96.6%", "mimeType": "image/webp", "width": 1620, "height": 1080 } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `BAD_REQUEST` | No `file` field |
  | 400 | `VALIDATION_ERROR` | Bad `purpose` |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 413 | `PAYLOAD_TOO_LARGE` | Over 4 MB, or too many pixels |
  | 415 | `UNSUPPORTED_MEDIA_TYPE` | Not an allowed image, or not multipart |
  | 422 | `IMAGE_PROCESSING_FAILED` | Corrupt image |
  | 429 | `RATE_LIMITED` | Rate limit hit |
  | 503 | `UPLOAD_FAILED` / `IMAGE_QUEUE_FULL` | Storage or queue unavailable |

#### `GET | POST /api/uploadthing` (UploadThing FileRouter, route `pdfUploader`)

PDFs go straight from the browser to UploadThing, which avoids the serverless body limit. Use `@uploadthing/react` with `endpoint="pdfUploader"`.

- **Limits:** PDF only, at most 16 MB, 1 file.
- **Auth:** the FileRouter `middleware` requires a valid session (otherwise `403 {"message":"Sign in to upload files."}`) and applies the `upload` rate limit.
- **`onUploadComplete`:** re-reads the stored file's first bytes, which must be `%PDF-`. If they aren't, the file is deleted from UploadThing and rejected. Otherwise it records an `UploadedFile` (kind `PDF`, owned by the uploader) and returns `{ url, key }` to the client.
- **Next step:** send that `url` and `key` to `POST /api/resources`.
- **Errors:** wrong type returns `400 {"message":"Invalid config: InvalidFileType"}`; too large returns `TOO_LARGE`.
- **Production note:** UploadThing calls back to `/api/uploadthing`, so the deployment URL must be publicly reachable. Local `next dev` uses UploadThing's dev stream instead.

#### `DELETE /api/upload/{key}`

Deletes an uploaded file from UploadThing (`UTApi.deleteFiles`) and from `UploadedFile`.

- **Auth:** cookie. The caller must be the owner or ADMIN+. **Headers:** `Origin`. **Rate limit:** `write`.
- **Success (200):**

  ```json
  { "success": true, "data": { "message": "File deleted.", "key": "oNCr…" } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Bad key format |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Not the owner |
  | 404 | `NOT_FOUND` | Unknown key |
  | 409 | `CONFLICT` | Still attached to a live resource |
  | 503 | `UPLOAD_DELETE_FAILED` | UploadThing unavailable |

Orphan cleanup: `npm run uploads:cleanup` lists tracked uploads older than 24 h that no user, club, event, resource, notice, lost & found item or complaint references. Add `-- --apply` to delete them from UploadThing and the database.

### Module 1: Clubs & events

#### `GET /api/clubs`

The active club directory, alphabetical.

- **Auth:** none. **Cached:** tag `clubs`.
- **Query:** `category?` (a `ClubCategory`), `q?` (name contains), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "cmuybdskx…", "name": "CU Blood Donors & Social Welfare Club", "slug": "cu-blood-donors-club", "description": "…", "logoUrl": null, "coverUrl": null, "category": "SOCIAL_SERVICE", "memberCount": 0 } ], "meta": { "limit": 3, "nextCursor": "cmuybdr6q…" } }
  ```

- **Errors:** 400 `VALIDATION_ERROR`, 429.

#### `GET /api/clubs/{slug}`

A club profile with its next 6 published events.

- **Auth:** none. **Cached:** tags `clubs`, `club:{id}` and `events`.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "name": "CU Computer Club", "slug": "cu-computer-club", "category": "TECHNOLOGY", "memberCount": 1, "upcomingEvents": [ { "id": "…", "title": "Hands-on Git & GitHub Workshop", "startAt": "2026-10-10T08:00:00.000Z", "spotsLeft": 59 } ] } }
  ```

- **Errors:** 400 (bad slug), 404 `NOT_FOUND`.

#### `GET /api/events`

The public event feed, sorted by `startAt` (newest first for `when=past`).

- **Auth:** none. **Cached:** tag `events`. The cache key includes an hourly "now" bucket.
- **Query:**
  - `when`: `upcoming` (default), `thisWeek` (the Dhaka Sat–Fri week), `past` or `all`.
  - `clubId?`, `clubSlug?`, `type?` (`WORKSHOP|CONTEST|SEMINAR|CULTURAL|SPORTS|MEETUP|OTHER`).
  - `dateFrom?`, `dateTo?` (ISO with offset; filters `startAt`).
  - `q?` (title or venue contains), `cursor?`, `limit?`.

  Example: `GET /api/events?when=thisWeek&type=WORKSHOP&limit=10`
- **Success (200):** event cards.

  ```json
  { "success": true, "data": [ { "id": "cmuycrmu2…", "title": "Acoustic Night", "slug": "acoustic-night", "type": "CULTURAL", "status": "PUBLISHED", "startAt": "2026-10-13T11:30:00.000Z", "endAt": "2026-10-13T14:30:00.000Z", "venue": "Cafeteria Lawn", "bannerUrl": null, "capacity": 150, "registrationCount": 1, "registrationDeadline": null, "spotsLeft": 149, "club": { "id": "…", "name": "CU Cultural Club", "slug": "cu-cultural-club", "logoUrl": null } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

- **Errors:** 400 `VALIDATION_ERROR` (bad enum or date, or `dateFrom >= dateTo`), 429.

#### `GET /api/events/calendar?month=YYYY-MM`

Lightweight month view in the Dhaka calendar. Includes published, completed and cancelled events (so the UI can strike cancelled ones out). Returns at most 500 events.

- **Auth:** none. **Cached:** tags `events` and `calendar`.
- **Success (200):**

  ```json
  { "success": true, "data": { "month": "2026-10", "events": [ { "id": "…", "title": "Debate 101: Parliamentary Format", "slug": "debate-101-parliamentary-format", "type": "WORKSHOP", "status": "PUBLISHED", "startAt": "…", "endAt": "…", "venue": "Room 305, Academic Building 1", "club": { "name": "CU Debating Society", "slug": "cu-debating-society" } } ] } }
  ```

- **Errors:** 400 (bad month).

#### `GET /api/events/{slug}`

The event page. Drafts return 404.

- **Auth:** none. **Cached:** tags `events` and `event:{id}`. The `registration` block is computed live on each request.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "title": "Mock Interview Day", "description": "…", "capacity": 5, "registrationCount": 2, "spotsLeft": 3, "status": "PUBLISHED", "club": { "name": "CU Career Development Club", "category": "ACADEMIC", "description": "…" }, "registration": { "closesAt": "2026-10-21T04:00:00.000Z", "isOpen": true, "blocker": null } } }
  ```

- **Errors:** 400 (bad slug), 404 `NOT_FOUND`.

#### `POST /api/events/{eventId}/register`

Registers the signed-in user for an event.

- **Auth:** cookie. **Headers:** `Origin`. **Rate limit:** `write`. **Body:** none.
- **What happens:**
  - The seat is claimed with one conditional `UPDATE … WHERE registrationCount < capacity` inside a transaction, so concurrent requests can never overbook. In testing, 10 parallel requests for 3 seats produced exactly 3 registrations and 7 `EVENT_FULL`.
  - The user gets a fresh `qrToken` (`nanoid(32)`), an in-app notification, and a confirmation email (sent after the response) with the QR PNG attached.
- **Success (201):**

  ```json
  { "success": true, "data": { "message": "You're registered. Your QR ticket has been emailed to you.", "registration": { "id": "cmuyd2b5t…", "status": "REGISTERED", "checkedInAt": null, "createdAt": "…", "event": { "id": "…", "title": "Acoustic Night", "registrationCount": 1, "…": "event card" } } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Bad id |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 404 | `NOT_FOUND` | Unknown event |
  | 409 | `EVENT_NOT_OPEN` / `EVENT_ENDED` / `REGISTRATION_CLOSED` / `ALREADY_REGISTERED` / `EVENT_FULL` | See the module error codes above |
  | 429 | `RATE_LIMITED` | Rate limit hit |

#### `DELETE /api/events/{eventId}/register`

Cancels the user's registration before the event starts and frees the seat.

- **Auth:** cookie. **Headers:** `Origin`.
- **Success (200):**

  ```json
  { "success": true, "data": { "message": "Registration cancelled." } }
  ```

- **Errors:** 404 (no active registration), 409 (the event has started), 401, 403.

#### `POST | DELETE /api/events/{eventId}/save`

Bookmarks or un-bookmarks an event. Both calls are idempotent.

- **Auth:** cookie. **Headers:** `Origin`.
- **Success (200):**

  ```json
  { "success": true, "data": { "saved": true, "eventId": "…" } }
  ```

- **Errors:** 404 (unknown or draft event), 401, 403.

#### `GET /api/me/registrations`

The user's registrations, newest first.

- **Auth:** cookie. **Query:** `status?` (`REGISTERED|CHECKED_IN|CANCELLED`), `cursor?`, `limit?`. **Response header:** `Cache-Control: private, no-store`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "status": "CHECKED_IN", "checkedInAt": "…", "createdAt": "…", "event": { "title": "ICPC Dhaka Regional Prep Contest", "…": "event card" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

- **Errors:** 401.

#### `GET /api/me/registrations/{id}/qr`

The owner's QR ticket. The QR encodes the opaque `qrToken`.

- **Auth:** cookie. Only the owner can fetch it; anyone else gets 404.
- **Query:** `format=json` (default) or `format=png`.
- **Success (200), JSON:**

  ```json
  { "success": true, "data": { "registrationId": "…", "status": "REGISTERED", "qrDataUrl": "data:image/png;base64,iVBORw0KGgo…" } }
  ```

  With `format=png`, the response is `image/png` bytes.
- **Errors:** 401; 404 (not found or not yours); 409 (cancelled).

#### `GET /api/me/saved-events`

The user's saved events, newest first.

- **Auth:** cookie. **Query:** `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "createdAt": "…", "event": { "…": "event card" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### Admin: clubs (`/api/admin/clubs`)

ADMIN and SUPER_ADMIN hold `clubs:manage`. A CLUB_ADMIN can list and edit only their own clubs. All mutations are audited and revalidate `clubs`, `club:{id}`, `events`, `calendar`, `forms` and `stats`.

| Method & path | Permission | Body / query | Success |
| --- | --- | --- | --- |
| `GET /api/admin/clubs` | `events:manage` | `q?`, `includeInactive?`, `cursor?`, `limit?` | 200: list with `_count.events` |
| `POST /api/admin/clubs` | `clubs:manage` | `{ "name": "CU Chess Club", "description": "…", "category": "OTHER", "slug?": "cu-chess-club", "logoUrl?": "<upload url>", "coverUrl?": "…", "isActive?": true }` | 201: the club (slug auto-generated if omitted) |
| `PATCH /api/admin/clubs/{id}` | `events:manage` + club scope | Any create field. A CLUB_ADMIN may only change `description`, `logoUrl`, `coverUrl` and `category`. | 200: the club |
| `DELETE /api/admin/clubs/{id}` | `clubs:manage` | none | 200: `{ "message": "Club deleted.", "id": "…" }` (soft delete) |

Errors: 400 `VALIDATION_ERROR` (including a foreign or external `logoUrl`); 403 (missing permission, another club, or a forbidden field such as `"Club admins cannot change: name, isActive."`); 404; 409 (duplicate name or slug, or deleting a club that still has upcoming events).

#### Admin: events (`/api/admin/events`)

Requires `events:manage` (CLUB_ADMIN, ADMIN, SUPER_ADMIN). A CLUB_ADMIN only sees and manages their own clubs' events. Every mutation is audited and revalidates `events`, `calendar`, `stats` and `event:{id}`.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/events` | `status?`, `clubId?`, `q?`, `cursor?`, `limit?` | 200: events in any status, newest start first |
| `POST /api/admin/events` | See the example below | 201: the event (`DRAFT`, or `PUBLISHED` with `"publish": true`) |
| `GET /api/admin/events/{id}` | none | 200: the event, including `createdBy` |
| `PATCH /api/admin/events/{id}` | Any field from the create body (all optional) | 200. If the time or venue of a published event changes, registrants are notified in-app and by bulk email. |
| `POST /api/admin/events/{id}/publish` | none | 200: `DRAFT` → `PUBLISHED` |
| `POST /api/admin/events/{id}/cancel` | `{ "reason": "Lab maintenance - we will reschedule soon." }` | 200: `CANCELLED`. Registrants are notified with the reason. |
| `DELETE /api/admin/events/{id}` | none | 200 (soft delete). Refused (409) for a published event that has registrations; cancel it first. |

Create body:

```json
{
  "title": "Hands-on Git & GitHub Workshop",
  "description": "Learn branching and pull requests…",
  "clubId": "cmuybdpc5…",
  "type": "WORKSHOP",
  "startAt": "2026-11-02T15:00:00+06:00",
  "endAt": "2026-11-02T18:00:00+06:00",
  "venue": "Computer Lab 3",
  "capacity": 60,
  "registrationDeadline": "2026-11-01T23:59:00+06:00",
  "bannerUrl": "https://<app>.ufs.sh/f/<key from /api/upload/image>",
  "publish": false
}
```

Errors:
- 400 `VALIDATION_ERROR`: `endAt <= startAt`, a deadline after the start, an unknown or inactive club, a foreign or external `bannerUrl`, or unknown keys such as `status` or `registrationCount`.
- 403: another club.
- 404: unknown event.
- 409: publishing a non-draft or an event that has ended, editing a cancelled or completed event, `capacity` below the current registrations, or deleting a published event that has registrations.

Attendee notifications run after the response. In-app rows are inserted 1,000 at a time, and emails go out in Brevo `messageVersions` batches of 500.

#### `GET /api/admin/events/{id}/registrations`

A searchable attendee list.

- **Permission:** `events:checkin`, with club scope. **Query:** `status?`, `q?` (name, email or student ID), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "status": "CHECKED_IN", "createdAt": "…", "checkedInAt": "…", "user": { "id": "…", "name": "Demo Student", "email": "…", "studentId": "CU-DEMO-001", "batch": "58", "department": { "code": "CSE" } } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `GET /api/admin/events/{id}/registrations/export`

Streams every registration as CSV, in batches of 1,000.

- **Permission:** `events:manage`, with club scope. Moderators get 403.
- **Success (200):** `text/csv; charset=utf-8` with a BOM for Excel and `Content-Disposition: attachment`. Columns: `Name, Email, Student ID, Department, Batch, Status, Registered At, Checked In At`. Cells are protected against formula injection (a leading `= + - @` is prefixed with `'`). The export is audited.

#### `GET /api/admin/events/{id}/stats`

Attendance numbers for one event.

- **Permission:** `events:checkin`, with club scope.
- **Success (200):**

  ```json
  { "success": true, "data": { "eventId": "…", "capacity": 40, "registered": 2, "checkedIn": 2, "cancelled": 1, "fillRate": 0.05, "noShowRate": null } }
  ```

  `noShowRate` is `(registered − checkedIn) / registered` and only appears once the event has ended.

#### `POST /api/admin/checkin`

Checks in an attendee by scanning their QR code.

- **Permission:** `events:checkin`. MODERATOR, ADMIN and SUPER_ADMIN can check in at any event; a CLUB_ADMIN only at their own clubs. Access to the door's event is checked **before** the ticket is looked up. **Rate limit:** 240/min.
- **Body:**

  ```json
  { "qrToken": "<32-char token decoded from the QR>", "eventId": "<event at this door>" }
  ```

- **Success (200):** the ticket moves `REGISTERED` → `CHECKED_IN` exactly once, through a conditional update, so racing scanners can't both succeed.

  ```json
  { "success": true, "data": { "registrationId": "…", "checkedInAt": "2026-10-07T17:11:06.887Z", "attendee": { "id": "…", "name": "Demo Student", "email": "…", "studentId": "CU-DEMO-001", "avatarUrl": null, "department": { "code": "CSE" } }, "event": { "id": "…", "title": "Live Demo Workshop" } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Bad token or id |
  | 403 | `FORBIDDEN` | Another club's door |
  | 404 | `TICKET_NOT_FOUND` | Unknown token |
  | 409 | `WRONG_EVENT` / `REGISTRATION_CANCELLED` / `ALREADY_CHECKED_IN` (with `details.checkedInAt`) / `EVENT_NOT_ACTIVE` / `CHECKIN_NOT_OPEN` / `CHECKIN_CLOSED` | See the module error codes above |

#### `POST /api/admin/events/{id}/registrations/{registrationId}/checkin`

Manual check-in by registration id, for an attendee without their phone. It uses the same rules, response and errors as QR check-in.

### Module 2: Resource hub

#### `GET /api/departments`

All departments with course counts.

- **Auth:** none. **Cached:** tag `departments`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "code": "CSE", "name": "Computer Science & Engineering", "faculty": "Faculty of Science & Engineering", "_count": { "courses": 8 } } ] }
  ```

#### `GET /api/courses`

Courses, ordered by semester and then code (at most 500).

- **Auth:** none. **Cached:** tags `courses` and `department:{id}`. **Query:** `departmentId?`, `semester?` (1–12).
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "code": "CSE-3201", "title": "Operating Systems", "semester": 6, "credits": 3, "department": { "id": "…", "code": "CSE" } } ] }
  ```

#### `GET /api/resources`

Lists and searches approved resources.

- **Auth:** none. **Cached:** tag `resources`. **Rate limit:** `search` when `q` is set, otherwise `publicRead`.
- **Query:**
  - `q?` (search text).
  - `departmentId?`, `courseId?`, `semester?`, `year?`, `type?` (`NOTES|QUESTION_PAPER|LAB_MANUAL|NOTICE|OTHER`).
  - `sort`: `relevance` (default; falls back to `newest` without `q`), `newest` or `popular`.
  - `cursor?`, `limit?`.

  Example: `GET /api/resources?q=CSE%202101&departmentId=…&sort=relevance`
- **Search:** one parameterized SQL query (`$queryRaw`; user text is never concatenated into SQL) that matches any of:
  - weighted full-text search (title and tags weight A, description weight B), against the query and its synonym and acronym expansions (`prev` → previous, `dbms` → database management, `os` → operating systems…);
  - `pg_trgm` `word_similarity` for typos (`algoritms` → *Algorithms*);
  - punctuation-insensitive course codes (`CSE 2101` = `cse-2101` = `CSE2101`);
  - course titles.

  Results are ranked: an exact full-text match first, then an any-term match, then title similarity, then a course hit.
- **Success (200):** `score` appears only for `sort=relevance` with a query. The file URL is **not** included; use the download endpoint.

  ```json
  { "success": true, "data": [ { "id": "…", "title": "CSE-2101 Class Test Questions (2023)", "description": "…", "type": "QUESTION_PAPER", "semester": 3, "year": 2023, "tags": ["cse-2101", "class test", "ct"], "fileSize": 1024, "downloadCount": 111, "bookmarkCount": 0, "isSample": true, "createdAt": "…", "department": { "id": "…", "code": "CSE", "name": "Computer Science & Engineering" }, "course": { "id": "…", "code": "CSE-2101", "title": "Data Structures" }, "score": 2.393 } ], "meta": { "limit": 20, "nextCursor": "eyJ2Ijo…" } }
  ```

- **Errors:** 400 `VALIDATION_ERROR` (bad filter, or a malformed `cursor`), 429.

#### `GET /api/resources/{id}`

The resource page. Only approved resources are visible.

- **Auth:** none. **Cached:** tags `resources`, `resource:{id}`, `course:{id}` and `department:{id}`.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "title": "…", "type": "QUESTION_PAPER", "fileSize": 1024, "mimeType": "application/pdf", "downloadCount": 113, "bookmarkCount": 0, "department": { "code": "CSE" }, "course": { "code": "CSE-2101", "title": "Data Structures", "semester": 3 }, "uploadedBy": { "name": "CampusOS Super Admin" } } }
  ```

- **Errors:** 400, 404 (unknown, pending, rejected or deleted).

#### `POST /api/resources/{id}/download`

Returns the file URL and counts the download, at most once per user per resource per 24 h.

- **Auth:** cookie. **Headers:** `Origin`. **Rate limit:** `write`.
- **Success (200):**

  ```json
  { "success": true, "data": { "fileUrl": "https://wqsc48wcpm.ufs.sh/f/…", "downloadCount": 112 } }
  ```

- **Errors:** 401, 403, 404.

#### `POST | DELETE /api/resources/{id}/bookmark`

Bookmarks or un-bookmarks a resource. Both calls are idempotent; `bookmarkCount` only changes when a row is actually created or removed.

- **Auth:** cookie. **Headers:** `Origin`.
- **Success (200):**

  ```json
  { "success": true, "data": { "bookmarked": true, "resourceId": "…" } }
  ```

- **Errors:** 401, 403, 404.

#### `GET /api/me/bookmarks`

Bookmarked resources that are still approved.

- **Auth:** cookie. **Query:** `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "createdAt": "…", "resource": { "id": "…", "title": "…", "type": "NOTES", "downloadCount": 12, "department": { "code": "CSE" }, "course": { "code": "CSE-3101", "title": "Database Management Systems" } } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `POST /api/resources`

Submits a resource. Upload the PDF first through the FileRouter.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `upload`.
- **Body:** `courseId`, `semester`, `year`, `description` and `tags` (at most 10, lower-cased and de-duplicated) are optional.

  ```json
  {
    "title": "DBMS Complete Notes (Normalization to Transactions)",
    "description": "Typed notes covering ER modelling, normal forms, SQL and transactions.",
    "type": "NOTES",
    "departmentId": "…",
    "courseId": "…",
    "semester": 5,
    "year": 2026,
    "tags": ["dbms", "sql"],
    "fileUrl": "https://<app>.ufs.sh/f/<key>",
    "fileKey": "<key>",
    "fileSize": 645,
    "mimeType": "application/pdf"
  }
  ```

- **Checks:**
  - The URL is on a trusted host, and `fileKey` matches it.
  - The key is tracked in `UploadedFile` as `PDF` and **owned by the caller**.
  - `fileSize` and `mimeType` match what was recorded.
  - The course belongs to the department.
  - The file is not already attached to another resource.
- **Success (201):** status is `PENDING` for students. Staff uploads are auto-`APPROVED` and revalidate the `resources` tags.

  ```json
  { "success": true, "data": { "message": "Thanks! Your resource is waiting for moderator review.", "resource": { "id": "…", "title": "…", "type": "NOTES", "status": "PENDING", "rejectionReason": null, "reviewedAt": null, "downloadCount": 0, "createdAt": "…", "department": { "code": "CSE" }, "course": { "code": "CSE-3101" } } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | External or foreign file, size mismatch, course outside the department, or a bad field |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 409 | `CONFLICT` | The file is already used by another resource |
  | 413 / 415 | | Body too large / not JSON |
  | 429 | `RATE_LIMITED` | Rate limit hit |

#### `GET /api/me/resources`

The user's own uploads with their moderation status and rejection reason.

- **Auth:** cookie. **Query:** `status?` (`PENDING|APPROVED|REJECTED`), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "title": "…", "type": "LAB_MANUAL", "status": "REJECTED", "rejectionReason": "Scanned pages are unreadable - please upload a clearer copy.", "reviewedAt": "…", "downloadCount": 0, "createdAt": "…", "department": { "code": "CE" }, "course": { "code": "CE-2201" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### Admin: resource moderation (`resources:moderate`, held by MODERATOR, ADMIN and SUPER_ADMIN)

Every mutation is audited. Approve, update and delete revalidate `resources`, `resource:{id}`, `course:{id}`, `department:{id}` and `stats`.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/resources` | `status` (default `PENDING`, oldest first), `departmentId?`, `q?`, `cursor?`, `limit?` | 200: items include `fileUrl` for previewing and `uploadedBy { name, email, studentId }` |
| `PATCH /api/admin/resources/{id}/review` | `{ "decision": "APPROVE" }` or `{ "decision": "REJECT", "reason": "Scanned pages are unreadable." }` | 200: the resource. The uploader gets a notification and an email. |
| `PATCH /api/admin/resources/{id}` | Any of `title`, `description`, `type`, `courseId`, `departmentId`, `semester`, `year`, `tags` | 200: the resource |
| `DELETE /api/admin/resources/{id}` | none | 200: `{ "message": "Resource deleted.", "id": "…" }` (soft delete) |

Errors: 400 (a reject without `reason`, a bad field, or a course outside the department); 403 (CLUB_ADMIN or student); 404; 409 (reviewing a resource that isn't `PENDING`).

#### Admin: departments & courses (`academics:manage`, held by ADMIN and SUPER_ADMIN)

| Method & path | Body | Success |
| --- | --- | --- |
| `POST /api/admin/departments` | `{ "code": "ARCH", "name": "Architecture", "faculty": "Faculty of Science & Engineering" }` (code is stored upper-case) | 201: the department |
| `PATCH /api/admin/departments/{id}` | Any create field | 200 |
| `DELETE /api/admin/departments/{id}` | none | 200. 409 if it is still referenced (`"Department is still referenced by: courses, resources, users."`) |
| `POST /api/admin/courses` | `{ "code": "arch 1101", "title": "Basic Design Studio", "departmentId": "…", "semester": 1, "credits": 3 }` | 201. The code is stored canonically (`ARCH-1101`). |
| `PATCH /api/admin/courses/{id}` | Any create field | 200 |
| `DELETE /api/admin/courses/{id}` | none | 200. 409 if any resources use the course (notices are unlinked automatically). |

Errors: 400 `VALIDATION_ERROR`; 403 (MODERATOR and below); 404; 409 (a duplicate code, or still in use). Every mutation revalidates `departments`, `courses`, `resources`, `notices`, `department:{id}` and `course:{id}`.

### Module 3: Smart helpdesk & chatbot

#### Chatbot rules

- **Grounded only.** The assistant answers **only from CampusOS data**: either deterministic intents built from live tables, or the knowledge base. It never invents information.
- **Pipeline:**
  1. Normalize the message: lower-case, strip punctuation, and map English, Banglish and Bangla vocabulary to canonical terms using `src/config/chatbot-synonyms.ts`. For example "porikkha", "পরীক্ষা" and "final" all become `exam`.
  2. Detect a **structured intent**: next bus (route/stop, Asia/Dhaka time), today's buses, open forms, events in the next 7 days, or the latest class cancellations. These are answered from `BusTrip`, `FormLink`, `Event` and `Notice` with `confidence: 1`.
  3. Otherwise, **retrieve** the top 8 KB entries with Postgres full-text search (`ts_rank_cd`), `pg_trgm` `word_similarity` and keyword-array overlap. All SQL is parameterized, and user text is never concatenated into SQL.
  4. **Confidence** blends those signals with *coverage*, meaning the share of the question's meaning units the entry actually addresses. An entry must cover at least a third of them, and question form (when/where/how) adds a small ranking bonus.
     - **HIGH (≥ 0.50):** the stored answer, its sources and page links.
     - **MEDIUM (≥ 0.30):** the closest answer plus "Did you mean…" suggestions.
     - **LOW:** the fixed reply "I don't have verified information about this yet" plus the 3 closest FAQs. The question is logged for admins.
  5. **Optional LLM** (only if `LLM_API_KEY` is set; Claude via `@anthropic-ai/sdk`): for HIGH or MEDIUM only, the retrieved entries and the question are sent with a strict "answer only from the context, otherwise reply NO_ANSWER" system prompt, a 3 s timeout and no retries. Any failure, refusal, empty or `NO_ANSWER` output falls back to the template answer. The bot is fully functional without a key. Server-side refusal fallback (`fallbacks: "default"`) is enabled.
- **Sample data:** answers from sample entries end with *"Note: this answer is from sample data and must be verified with the relevant office."*

#### `GET /api/helpdesk/entries`

Lists published FAQ entries.

- **Auth:** none. **Cached:** tag `kb`.
- **Query:** `category?` (`BUS|RULES|EXAM|ADMISSION|GENERAL|FAQ`), `q?`, `cursor?`, `limit?`. Without `q`, entries are sorted by category then question and cursor-paginated. With `q`, the chatbot's ranked retrieval returns the top 20 (`nextCursor: null`).
- **Success (200):** `sourceType` is `MANUAL|IMPORT|BUS_ROUTE|NOTICE|…`. `BUS_ROUTE` and `NOTICE` entries are auto-synced.

  ```json
  { "success": true, "data": [ { "id": "…", "category": "BUS", "question": "Are bus timings different during exams?", "answer": "…", "keywords": ["bus", "exam"], "isSample": true, "sourceType": "MANUAL", "updatedAt": "…" } ], "meta": { "limit": 20, "nextCursor": "…" } }
  ```

- **Errors:** 400 `VALIDATION_ERROR`, 429.

#### `GET /api/helpdesk/categories`

Category counts for the FAQ page.

- **Auth:** none. **Cached:** tag `kb`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "category": "BUS", "count": 16 }, { "category": "EXAM", "count": 16 } ] }
  ```

#### `GET /api/helpdesk/entries/{id}`

One published entry. `viewCount` is incremented after the response (via `after()`) and is not part of the payload.

- **Auth:** none. **Cached:** tags `kb` and `kb:{id}`.
- **Success (200):** the entry object, as above.
- **Errors:** 400, 404.

#### `POST /api/chatbot/message`

Asks the campus assistant.

- **Auth:** optional. Anonymous visitors are limited to **10/min per IP**; signed-in users to **30/min**. **Headers:** `Origin`, `Content-Type: application/json`.
- **Body:** omit `sessionId` to start a session. The returned `sessionId` is an unguessable 32-character token. `message` is at most 500 characters.

  ```json
  { "sessionId": "abC8sI…", "message": "mirpur er porer bus kokhon?" }
  ```

- **Success (200), intent answer:**

  ```json
  { "success": true, "data": { "sessionId": "abC8sI…", "messageId": "cmuy…", "answer": "Next R2 Mirpur buses at Mirpur 10:\n• 07:15 tomorrow - to campus\n…", "level": "HIGH", "confidence": 1, "intent": "NEXT_BUS", "answeredBy": "intent", "sources": [ { "id": "/bus?route=R2", "title": "Route R2 - Mirpur", "category": "GENERAL", "link": "/bus?route=R2" } ], "suggestions": [] } }
  ```

- **Success (200), out of scope:**

  ```json
  { "success": true, "data": { "answer": "I don't have verified information about this yet. I've logged your question so the CampusOS team can add an answer.", "level": "LOW", "confidence": 0.09, "intent": null, "answeredBy": "fallback", "sources": [], "suggestions": [ { "id": "…", "question": "What is the minimum class attendance requirement?", "link": "/helpdesk/…" } ] } }
  ```

  `answeredBy` is one of `intent`, `knowledge_base`, `llm` or `fallback`.
- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Empty, over 500 characters, or a bad session id |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 404 | `NOT_FOUND` | Session not found or not yours |
  | 429 | `RATE_LIMITED` | Rate limit hit |

#### `GET /api/chatbot/sessions/{sessionId}`

The last 50 messages of a session, oldest first.

- **Auth:** the session's owner. Anonymous sessions are reachable only through their unguessable token, and a signed-in user's session is never visible to anyone else (they get 404).
- **Success (200):**

  ```json
  { "success": true, "data": { "sessionId": "…", "messages": [ { "id": "…", "role": "USER", "content": "Is the university bus free for students?", "confidence": null, "intent": null, "feedback": null, "createdAt": "…" } ] } }
  ```

- **Errors:** 400 (bad token), 404.

#### `POST /api/chatbot/messages/{messageId}/feedback`

Thumbs up or down on an assistant message.

- **Auth:** the session's owner. **Headers:** `Origin`.
- **Body:**

  ```json
  { "sessionId": "…", "helpful": false }
  ```

- **Success (200):**

  ```json
  { "success": true, "data": { "messageId": "…", "feedback": "NOT_HELPFUL" } }
  ```

- **Errors:** 400, 404 (not an assistant message in that session).

#### `GET /api/admin/chatbot/unanswered`

Knowledge gaps for admins to fill. Requires `chat:analytics` (ADMIN+).

- **Query:** `type=unanswered` (default; questions the bot refused) or `type=unhelpful` (thumbs-down answers, paired with their question), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "question": "What is the capital of Mars?", "answer": null, "confidence": null, "createdAt": "…" } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

- **Errors:** 401, 403.

#### Admin: knowledge base (`kb:manage`, held by ADMIN and SUPER_ADMIN)

All mutations are audited and revalidate `kb`. Editing an entry's question or answer clears its `isSample` flag, because an admin has now verified it.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/helpdesk/entries` | `category?`, `published?`, `q?`, `cursor?`, `limit?` | 200: all entries, including unpublished ones, `viewCount` and the sample flag |
| `POST /api/admin/helpdesk/entries` | `{ "category": "GENERAL", "question": "Where is the IT Help Desk?", "answer": "…", "keywords": ["it","help"], "isPublished": true }` | 201: the entry |
| `PATCH /api/admin/helpdesk/entries/{id}` | Any field. `{ "isPublished": false }` unpublishes and `true` publishes. | 200 |
| `DELETE /api/admin/helpdesk/entries/{id}` | none | 200: `{ "message": "Entry deleted.", "id": "…" }` |
| `POST /api/admin/helpdesk/import` | `{ "entries": [ {…create body…} ], "skipDuplicates": true }` (max 500 entries, 1 MB) | 201: `{ "created": 12, "skipped": ["Existing question?"] }`. With `skipDuplicates: false`, duplicates return 409 with `details.duplicates`. |

Errors: 400, 401, 403, 404, 409.

**Auto-sync.** Generated knowledge-base entries keep the chatbot current:
- Creating, updating or deleting a bus route or trip regenerates that route's entry (for example *"When does the Dhanmondi bus (route R1) run?"*).
- Creating, updating or deleting an `EXAM` notice creates, updates or removes its entry.

### Bus schedule

#### `GET /api/bus/routes`

All active routes with their stops (`[{ name, offsetMinutes }]` in to-campus order) and active trips.

- **Auth:** none. **Cached:** tag `buses`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "code": "R1", "name": "Dhanmondi", "stops": [ { "name": "Dhanmondi 27", "offsetMinutes": 0 }, { "name": "City University Campus (Khagan, Birulia)", "offsetMinutes": 75 } ], "notes": "…", "trips": [ { "id": "…", "departureTime": "07:00", "direction": "TO_CAMPUS", "daysOfWeek": [0,1,2,3,4,6], "isActive": true } ] } ] }
  ```

#### `GET /api/bus/routes/{code}`

One route plus `nextDepartures`, computed live in Asia/Dhaka time.

- **Auth:** none. **Cached:** tags `buses` and `bus:{id}`.
- **Success (200):**

  ```json
  { "success": true, "data": { "code": "R1", "name": "Dhanmondi", "stops": [], "trips": [], "nextDepartures": [ { "tripId": "…", "direction": "TO_CAMPUS", "stop": "Dhanmondi 27", "time": "07:00", "at": "2026-10-08T01:00:00.000Z", "dayOffset": 0, "minutesUntil": 411 } ] } }
  ```

- **Errors:** 400, 404.

#### `GET /api/bus/next?route=R2&stop=gabtoli&direction=FROM_CAMPUS&limit=3`

Next departures at a stop.

- **Auth:** none. **Behaviour:** `stop` is matched case-insensitively. A `FROM_CAMPUS` trip reaches the stop at departure + (journey − stop offset). Fridays and holidays roll over to the next service day.
- **Success (200):**

  ```json
  { "success": true, "data": { "route": { "code": "R2", "name": "Mirpur" }, "stop": "Gabtoli", "now": "…", "departures": [ { "time": "14:05", "direction": "FROM_CAMPUS", "dayOffset": 0, "minutesUntil": 845, "at": "2026-10-08T08:05:00.000Z" } ] } }
  ```

- **Errors:** 400 (bad code, or an unknown stop; the message lists the valid stops), 404.

#### Admin: bus (`buses:manage`, held by ADMIN and SUPER_ADMIN)

Every mutation is audited, regenerates the route's KB entry, and revalidates `buses`, `kb`, `stats` and `bus:{id}`.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/bus/routes` | none | 200: all routes, including inactive ones and all trips |
| `POST /api/admin/bus/routes` | `{ "code": "R7", "name": "Gazipur", "stops": [ { "name": "Gazipur Chowrasta", "offsetMinutes": 0 }, { "name": "Campus", "offsetMinutes": 90 } ], "notes": null, "isActive": true }`. The first offset must be 0 and offsets must strictly increase. | 201 |
| `PATCH /api/admin/bus/routes/{id}` | Any of `name`, `stops`, `notes`, `isActive` | 200 |
| `DELETE /api/admin/bus/routes/{id}` | none | 200 (soft delete; its KB entry is removed) |
| `POST /api/admin/bus/routes/{id}/trips` | `{ "departureTime": "19:00", "direction": "FROM_CAMPUS", "daysOfWeek": [6,0,1,2,3,4] }` (0 = Sunday) | 201 |
| `PATCH /api/admin/bus/trips/{id}` | Any trip field | 200 |
| `DELETE /api/admin/bus/trips/{id}` | none | 200 |

Errors: 400 (bad `HH:mm`, days or stops), 403, 404, 409 (duplicate code).

### Notices, forms & follows

#### `GET /api/notices`

Live notices (non-expired), pinned first, then newest.

- **Auth:** none. **Cached:** tag `notices`, with an hourly key for expiry.
- **Query:** `category?` (`CLASS_CANCELLATION|EXAM|GENERAL|URGENT|FORM_DEADLINE`), `departmentId?`, `courseId?`, `q?`, `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "title": "Midterm Exam Schedule - Fall 2026", "body": "…", "category": "EXAM", "pinned": true, "expiresAt": null, "attachmentUrl": null, "createdAt": "…", "department": null, "course": null } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `GET /api/notices/{id}`

One notice.

- **Auth:** none. **Cached:** tags `notices` and `notice:{id}`.
- **Success (200):** the notice object. **Errors:** 400, 404.

#### Admin: notices (`notices:manage`, held by ADMIN and SUPER_ADMIN)

`attachmentUrl` must be a PDF or image from the upload pipeline. Mutations are audited, revalidate `notices`, `notice:{id}`, `kb` and `stats`, and re-sync EXAM notices into the knowledge base.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/notices` | `cursor?`, `limit?` | 200: all notices, including expired ones |
| `POST /api/admin/notices` | `{ "title": "CSE-3101 lab moved to Lab 4", "body": "…", "category": "GENERAL", "departmentId": "…", "courseId": "…", "pinned": false, "expiresAt": "2026-11-01T00:00:00+06:00", "attachmentUrl": null }` | 201. After the response, an **in-app notification fan-out** reaches students of that department and followers of the department or course, in batches of 1,000. Global notices (no department or course) are not fanned out. |
| `PATCH /api/admin/notices/{id}` | Any create field | 200 |
| `DELETE /api/admin/notices/{id}` | none | 200 (soft delete) |

Errors: 400 (unknown department or course, a course from another department, or a foreign attachment), 403, 404.

#### `GET /api/forms`

Open forms (for example Google Forms) whose deadline hasn't passed, soonest deadline first; forms with no deadline come last.

- **Auth:** none. **Cached:** tag `forms`. **Query:** `clubId?`, `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "title": "Blood Donation Camp Volunteer Sign-up", "description": "…", "url": "https://…", "deadline": "2026-10-12T17:58:00.000Z", "club": { "id": "…", "name": "CU Blood Donors & Social Welfare Club", "slug": "cu-blood-donors-club" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### Admin: forms (`forms:manage`, held by CLUB_ADMIN for their own clubs, ADMIN and SUPER_ADMIN)

URLs must be https. A CLUB_ADMIN must set the `clubId` of one of their clubs; admins may post campus-wide forms. Mutations are audited and revalidate `forms`.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/forms` | `cursor?`, `limit?` | 200 (scoped to the CLUB_ADMIN's clubs) |
| `POST /api/admin/forms` | `{ "title": "Computer Club Volunteer Form", "url": "https://forms.gle/…", "clubId": "…", "deadline": "2026-12-01T23:59:00+06:00", "description": null, "isOpen": true }` | 201 |
| `PATCH /api/admin/forms/{id}` | Any field | 200 |
| `DELETE /api/admin/forms/{id}` | none | 200 (soft delete) |

Errors: 400 (non-https URL, or a CLUB_ADMIN without a club), 403 (another club), 404.

#### `POST /api/follow` · `DELETE /api/follow?targetType=COURSE&targetId=…` · `GET /api/me/follows`

Follow or unfollow a department, course or club. Following drives notice notifications.

- **Auth:** cookie. **Headers:** `Origin`.
- **POST body:**

  ```json
  { "targetType": "COURSE", "targetId": "cmuy…" }
  ```

- **Success (200):**

  ```json
  { "success": true, "data": { "following": true, "targetType": "COURSE", "targetId": "…" } }
  ```

  `GET /api/me/follows` returns `[ { "targetType": "COURSE", "targetId": "…", "name": "CSE-3101 Database Management Systems", "createdAt": "…" } ]`.
- **Errors:** 400, 401, 404 (the target doesn't exist).

### Module 4: Lost & found + complaints

#### `GET /api/lost-found`

The public board. Cards contain **no reporter identity or contact details**.

- **Auth:** none. **Cached:** tag `lost-found`.
- **Query:** `type?` (`LOST|FOUND`), `category?`, `status` (default `OPEN`; `OPEN|CLAIMED|RESOLVED` — hidden posts are never listed), `q?`, `dateFrom?`, `dateTo?`, `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "type": "FOUND", "title": "Black wallet found near library", "description": "…", "category": "WALLET", "locationText": "Library staircase", "occurredAt": "…", "imageUrls": [], "status": "OPEN", "createdAt": "…" } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `POST /api/lost-found`

Posts a lost or found item.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `upload`.
- **Body:** `imageUrls` (at most 4) must be the caller's own uploads from `/api/upload/image` with `purpose=lost-found`. `contactVisible` (default `false`) lets an **approved claimer** see your email and phone; contact details are never public.

  ```json
  { "type": "LOST", "title": "Grey backpack", "description": "Grey backpack with a laptop charger inside.", "category": "BAG", "locationText": "Bus R1", "occurredAt": "2026-10-07T09:00:00+06:00", "imageUrls": [], "contactVisible": true }
  ```

- **Success (201):** the post, including `contactVisible`, `resolvedAt` and `_count.claims`.
- **Errors:** 400 (a foreign or external photo URL, more than 4 photos, or a future date), 401, 403, 429.

#### `GET /api/lost-found/{id}`

The public post plus a per-viewer `viewer` block.

- **Auth:** none required. **Cached:** the post itself, under tags `lost-found` and `lf:{id}`. The `viewer` block is computed live.
- **`viewer.contact`** contains the other party's name, email and phone, and is shown **only** to:
  - the reporter, once a claim is approved (the claimer's contact);
  - the approved claimer, when the reporter set `contactVisible: true` (the reporter's contact).

  Anonymous viewers and other users always get `null`.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "title": "…", "status": "CLAIMED", "reporter": { "name": "Demo Student Two" }, "_count": { "claims": 1 }, "viewer": { "isReporter": false, "myClaim": { "id": "…", "status": "APPROVED" }, "contact": { "name": "Demo Student Two", "email": "…", "phone": null } } } }
  ```

- **Errors:** 400, 404 (unknown, removed or hidden).

#### `PATCH /api/lost-found/{id}` · `DELETE /api/lost-found/{id}`

Edits or soft-deletes your own post. Edits are allowed only while the post is `OPEN`.

- **Auth:** cookie (reporter).
- **PATCH body:** any of `title`, `description`, `category`, `locationText`, `occurredAt`, `imageUrls`, `contactVisible`.

  ```json
  { "contactVisible": true }
  ```

- **Success (200):** the updated post. DELETE returns `{ "message": "Post deleted.", "id": "…" }`.
- **Errors:** 400, 401, 403 (not yours), 404, 409 (not `OPEN`).

#### `POST /api/lost-found/{id}/claim`

Claims an item. The reporter is notified in-app and by email.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`.
- **Body:**

  ```json
  { "message": "Black leather wallet, has my NID (Rahim) and a CU library card inside." }
  ```

- **Success (201):**

  ```json
  { "success": true, "data": { "message": "Claim sent. The reporter has been notified.", "claim": { "id": "…", "status": "PENDING", "createdAt": "…" } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 409 | `OWN_ITEM` | You reported this item |
  | 409 | `ITEM_NOT_OPEN` | The item is no longer open |
  | 409 | `ALREADY_CLAIMED` | You already have a pending or approved claim. A claim that was rejected can be filed again. |
  | 400 / 401 / 404 | | Bad input, not signed in, unknown item |

#### `GET /api/lost-found/{id}/claims` · `PATCH /api/lost-found/{id}/claims/{claimId}`

Lists and decides claims.

- **Auth:** the reporter or a `lostfound:moderate` user.
- **GET success (200):**

  ```json
  [ { "id": "…", "message": "…", "status": "PENDING", "createdAt": "…", "claimer": { "id": "…", "name": "Demo Student", "studentId": "CU-DEMO-001" } } ]
  ```

  No contact details are included.
- **PATCH body:**

  ```json
  { "decision": "APPROVE" }
  ```

  or `{ "decision": "REJECT" }`.
- **PATCH success (200):** `{ "claimId": "…", "decision": "APPROVE", "itemStatus": "CLAIMED" }`. Approving marks the item `CLAIMED` and auto-rejects other pending claims. Every affected claimer is notified in-app and by email.
- **Errors:** 403 (strangers), 404, 409 (claim not `PENDING`, or the item already claimed).

#### `PATCH /api/lost-found/{id}/status`

Moves the item through its lifecycle.

- **Auth:** the reporter or a moderator.
- **Body:** `{ "status": "RESOLVED" }`.
- **Allowed transitions:**
  - Reporter: `OPEN → RESOLVED`, `CLAIMED → RESOLVED`, and `CLAIMED → OPEN` (a claim fell through; the approved claim is rejected).
  - Moderators may make any transition.
- **Success (200):** `{ "id": "…", "status": "RESOLVED" }`.
- **Errors:** 403; 409 (an illegal transition, for example `"Cannot change status from RESOLVED to OPEN."`).

#### `GET /api/lost-found/{id}/matches`

Up to 5 likely counterpart posts.

- **Auth:** none. **Cached:** tags `lost-found` and `lf:{id}`.
- **Matching:** posts of the opposite type, still `OPEN`, within ±60 days. The score is 0.35·same category + 0.45·`pg_trgm` text similarity + 0.2·date proximity.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "type": "FOUND", "title": "Black wallet found near library", "score": 0.6766, "…": "card fields" } ] }
  ```

#### `GET /api/me/lost-found`

Your own posts, in any status, with claim counts.

- **Auth:** cookie. **Query:** `status?`, `cursor?`, `limit?`.

#### Admin: lost & found moderation (`lostfound:moderate`, held by MODERATOR, ADMIN and SUPER_ADMIN)

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/lost-found` | `status?`, `type?`, `q?`, `cursor?`, `limit?` | 200: every post, including hidden ones, with the reporter's identity |
| `PATCH /api/admin/lost-found/{id}` | `{ "action": "HIDE", "reason": "Contains a personal phone number." }`. `action` is `HIDE`, `RESTORE`, `RESOLVE` or `REMOVE`; HIDE and REMOVE need a `reason`. | 200: `{ "id": "…", "action": "HIDE" }`. The action is audited and, for HIDE and REMOVE, the reporter is notified. |

Errors: 400 (no reason), 403, 404.

#### `POST /api/complaints`

Files a complaint.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `upload`.
- **Body:** `category` is `ACADEMIC|ADMINISTRATIVE|FACILITIES|TRANSPORT|IT_SERVICES|FINANCE|HARASSMENT|OTHER`. `attachmentUrls` (at most 4) must be your own image uploads. With `isAnonymous: true`, staff never see who filed it.

  ```json
  { "category": "TRANSPORT", "subject": "Bus R1 left 15 minutes early", "description": "The 08:30 R1 bus left Dhanmondi 27 at 08:15 today…", "attachmentUrls": [], "isAnonymous": false }
  ```

- **What happens:** a ticket `CU-<Dhaka year>-<6-digit sequence>` is allocated by an atomic per-year counter. Harassment complaints are auto-prioritized `HIGH`. A confirmation goes out in-app and by email.
- **Success (201):**

  ```json
  { "success": true, "data": { "message": "Complaint received. Your ticket number is CU-2026-000002.", "complaint": { "id": "…", "ticketNo": "CU-2026-000002", "category": "TRANSPORT", "subject": "…", "status": "RECEIVED", "priority": "MEDIUM", "isAnonymous": false, "createdAt": "…" } } }
  ```

- **Errors:** 400, 401, 403, 429.

#### `GET /api/me/complaints`

Your complaints, newest first.

- **Auth:** cookie. **Query:** `status?`, `cursor?`, `limit?`. **Response header:** `Cache-Control: private, no-store`. Complaints are never cached publicly.

#### `GET /api/complaints/track/{ticketNo}`

Tracks a ticket.

- **Auth:** optional. **Rate limit:** 10 per 15 min per IP, against enumeration.
- **Views:**
  - **Signed-in owner:** full details plus the public timeline (internal notes are excluded).
  - **`?email=<complainant email>`:** a limited view with `ticketNo`, `category`, `status`, the dates and a timeline of statuses only. No subject, description or notes.
  - **Anything else** (wrong email, someone else's ticket, unknown ticket): the same `404 NOT_FOUND`, so tickets can't be enumerated.
- **Success (200), owner:**

  ```json
  { "success": true, "data": { "view": "owner", "ticketNo": "CU-2026-000002", "status": "RESOLVED", "subject": "…", "timeline": [ { "status": "RECEIVED", "note": "Complaint received.", "createdAt": "…" }, { "status": "RESOLVED", "note": "The driver has been warned…", "createdAt": "…" } ] } }
  ```

- **Errors:** 400 (malformed ticket), 404, 429.

#### Admin: complaints (`complaints:manage`, held by MODERATOR, ADMIN and SUPER_ADMIN)

For anonymous complaints, `user` is `null` everywhere, including the complainant's own timeline entries.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/complaints` | `status?`, `priority?`, `category?`, `assignee?` (`me`, `unassigned` or a user id), `q?` (ticket or subject), `cursor?`, `limit?` | 200: list with `user` (or `null`) and `assignedTo` |
| `GET /api/admin/complaints/{id}` | none | 200: full detail including **internal** notes and their authors |
| `PATCH /api/admin/complaints/{id}` | `{ "status": "IN_REVIEW", "priority": "HIGH", "assignedToId": "<staff id>", "note": "Forwarded to the Transport Office.", "isInternal": false }` (any subset) | 200: the updated detail. Each change adds a `ComplaintUpdate`; RESOLVED sets `resolvedAt`. Status changes and **public** notes notify the complainant in-app and by email; internal notes never do. |

Errors: 400 (the assignee must be active complaints staff, or nothing to update), 403, 404.

### Platform

#### `GET /api/search?q=dbms&limit=5`

Grouped search across events (upcoming), resources (ranked search), notices (live), helpdesk (KB retrieval) and lost & found (open or claimed).

- **Auth:** none. **Rate limit:** `search`. **Cached:** per normalized query, under tags `events`, `resources`, `notices`, `kb` and `lost-found`. Terms are logged to `SearchTerm` after the response, for the top-searched-terms chart.
- **Query:** `limit` is 1–10 per group (default 5).
- **Success (200):**

  ```json
  { "success": true, "data": { "q": "dbms", "results": { "events": [], "resources": [ { "id": "…", "title": "Database Management Systems - Complete Lecture Notes", "subtitle": "CSE-3101 · CSE", "link": "/resources/…" } ], "notices": [], "helpdesk": [], "lostFound": [] } } }
  ```

- **Errors:** 400 (`q` under 2 characters), 429.

#### Notifications (cookie auth, `Cache-Control: private, no-store`)

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/notifications` | `unreadOnly?` (`true`), `cursor?`, `limit?` | 200: `[ { "id": "…", "type": "COMPLAINT", "title": "Update on CU-2026-000002", "body": "…", "link": "/complaints/CU-2026-000002", "readAt": null, "createdAt": "…" } ]` |
| `GET /api/notifications/unread-count` | none | 200: `{ "unread": 7 }` |
| `PATCH /api/notifications/{id}/read` | none (needs `Origin`) | 200: `{ "id": "…", "read": true }`. 404 if it isn't yours. |
| `POST /api/notifications/read-all` | none (needs `Origin`) | 200: `{ "marked": 6 }` |

#### `GET /api/cron/reminders`

The "event starts tomorrow" job, built for Vercel Cron.

- **Auth:** `Authorization: Bearer <CRON_SECRET>`; otherwise 401.
- **Behaviour:** registrants of published events that start tomorrow (Asia/Dhaka) get an in-app notification and a bulk email. Each event is claimed with `reminderSentAt` first, so repeated runs never double-send. The same job is available as `npm run reminders:send`.
- **Success (200):**

  ```json
  { "success": true, "data": { "events": 1, "notified": 0, "emailed": 0 } }
  ```

  A second run returns `{ "events": 0, … }`.

#### `GET /api/admin/stats`

The admin dashboard.

- **Permission:** `admin:access` (any staff role). **Cached:** tag `stats`, with an hourly key.
- **Success (200):** `totals` plus chart series. Signups are per Dhaka day over 30 days and registrations per week over 12 weeks; `complaintResolution` is in hours, and the top 5 events and top 10 search terms are included.

  ```json
  { "success": true, "data": { "generatedAt": "…", "totals": { "users": 6, "events": 30, "registrations": 6, "checkIns": 1, "resources": 55, "pendingResources": 4, "lostFound": 6, "openLostFound": 5, "complaints": 2, "openComplaints": 1, "chatbotUnanswered": 10, "chatbotUnhelpful": 1 }, "charts": { "signupsPerDay": [ { "day": "2026-10-07", "count": 6 } ], "registrationsPerWeek": [], "complaintResolution": { "resolved": 1, "avgHours": 0, "medianHours": 0 }, "topEvents": [], "topSearchTerms": [ { "term": "bus", "count": 2 } ] } } }
  ```

- **Errors:** 401, 403.

#### Admin: users & audit

| Method & path | Permission | Body / query | Success / rules |
| --- | --- | --- | --- |
| `GET /api/admin/users` | `users:manage` (ADMIN+) | `q?` (name, email or student ID), `role?`, `isActive?`, `cursor?`, `limit?` | 200: users (no secrets) |
| `PATCH /api/admin/users/{id}` | `users:manage` | `{ "role": "MODERATOR" }` and/or `{ "isActive": false }` | 200: the user. Every change **revokes that user's sessions** (tokenVersion++). You can't change your own account here, and only a SUPER_ADMIN may grant or touch ADMIN/SUPER_ADMIN (otherwise 403). |
| `POST /api/admin/users/{id}/force-logout` | `users:manage` | none (needs `Origin`) | 200: `{ "message": "User signed out on all devices.", "id": "…" }` (same rules) |
| `GET /api/admin/audit-logs` | `audit:view` (ADMIN+) | `action?` (e.g. `complaint.update`), `entityType?`, `entityId?`, `actorId?`, `cursor?`, `limit?` | 200: `[ { "id": "…", "action": "user.update", "entityType": "User", "entityId": "…", "metadata": {}, "ip": "…", "createdAt": "…", "actor": { "id": "…", "name": "…", "role": "ADMIN" } } ]` |

#### `POST /api/revalidate`

Manual cache revalidation for operations; server to server, so there is no Origin check.

- **Auth:** header `x-revalidate-secret: <REVALIDATE_SECRET>`; otherwise 401. **Rate limit:** `authStrict`.
- **Body:**

  ```json
  { "tags": ["events", "kb", "event:cmuy…", "everything"] }
  ```

  Only the static tags in the tag map and `<kind>:<cuid>` tags are allowed. Anything else is reported back as `rejected`.
- **Success (200):**

  ```json
  { "success": true, "data": { "revalidated": ["events", "kb", "event:cmuy…"], "rejected": ["everything"] } }
  ```

- **Errors:** 400 (no allowlisted tags), 401, 429.

#### `GET /api/health`

Uptime probe, sent with `Cache-Control: no-store`.

- **Success (200):**

  ```json
  { "success": true, "data": { "status": "ok", "version": "0.1.0", "db": { "ok": true, "latencyMs": 277 }, "uptimeSeconds": 28, "time": "…" } }
  ```

- **Errors:** 503 `DEGRADED` when the database is unreachable.

#### `GET /sitemap.xml`

Generated by `src/app/sitemap.ts`. It lists the static public pages plus every published event, approved resource, live notice, published FAQ entry and active club, tag-cached under `events`, `resources`, `notices`, `kb` and `clubs`.

## Caching tag map

How it works:
- **Reads:** public data uses `"use cache"` + `cacheLife("max")` + `cacheTag(...)`. The fetchers live in `src/server/queries/*`.
- **Writes:** every mutation calls a helper in `src/lib/cache-tags.ts`. The helpers call `revalidateTag(tag, { expire: 0 })`, which expires the entry immediately, so the next request re-renders from the database and nobody sees a cancelled event or a deleted resource. We tested `"max"` (stale-while-revalidate) first and it served one stale response after each mutation. Mutations are rare and hot counters only touch per-item detail tags, so the extra render is cheap.
- **Time:** there is no time-based revalidation. Fetchers that depend on "now" (upcoming, this-week and past events, a club's next events) take an hour bucket as an argument, so the cache **key** changes at most hourly.
- **Measured** (local `next start` → Neon us-east-2): `GET /api/events` took 577 ms on a cache miss and about 4 ms on a hit.

| Tag | Covers | Invalidated by |
| --- | --- | --- |
| `events` | Event lists, event pages, club pages' upcoming events | `revalidateEvents()`, `revalidateClubs()` (event create/update/publish/cancel/delete, club changes) |
| `event:{id}` | One event's page (seat count) | `revalidateEvents(id)`, `revalidateEventDetail(id)` (register, cancel registration, check-in) |
| `calendar` | `GET /api/events/calendar` | `revalidateEvents()`, `revalidateClubs()` |
| `clubs` | Club directory and club pages | `revalidateClubs()` |
| `club:{id}` | One club page | `revalidateClubs(id)` |
| `forms` | Forms & deadlines listing | `revalidateForms()`, `revalidateClubs()` |
| `resources` | Resource lists, search and detail | `revalidateResources()` (approve, staff upload, update, delete), `revalidateAcademics()` |
| `resource:{id}` | One resource page (download and bookmark counts) | `revalidateResources(id)`, `revalidateResourceDetail(id)` (download, bookmark) |
| `departments` / `courses` | `GET /api/departments`, `GET /api/courses` | `revalidateAcademics()` |
| `department:{id}` / `course:{id}` | Course lists per department, resource pages in that course or department | `revalidateAcademics(refs)`, `revalidateResources(id, refs)` |
| `notices` | `GET /api/notices`, the chatbot's class-cancellation intent, global search, sitemap | `revalidateNotices()` (notice create/update/delete), `revalidateAcademics()` |
| `notice:{id}` | `GET /api/notices/{id}` | `revalidateNotices(id)` |
| `forms` | `GET /api/forms`, the chatbot's open-forms intent | `revalidateForms()` (form create/update/delete), `revalidateClubs()` |
| `buses` | `GET /api/bus/routes`, `GET /api/bus/routes/{code}`, `/api/bus/next`, chatbot bus intents | `revalidateBuses()` (route or trip create/update/delete) |
| `bus:{id}` | One route | `revalidateBuses(id)` |
| `kb` | Helpdesk lists, categories and entries, **cached chatbot retrieval**, global search, sitemap | `revalidateKnowledgeBase()` (entry CRUD, publish, import), `revalidateBuses()` and notice mutations (auto-synced entries) |
| `kb:{id}` | `GET /api/helpdesk/entries/{id}` | `revalidateKnowledgeBase(id)` |
| `lost-found` | `GET /api/lost-found`, item pages, matches, global search | `revalidateLostFound()` (post create/edit/delete, claim decisions, status changes, moderation) |
| `lf:{id}` | One post and its matches | `revalidateLostFound(id)` |
| `stats` | `GET /api/admin/stats` (hourly key) | Every collection helper, plus complaint and user changes |

**Never cached** (user-specific or private): notifications, my registrations, bookmarks, follows and posts, chatbot sessions, complaints (filing, tracking, admin), the per-viewer `viewer` block of a lost & found post, and admin lists.

## Security

- Zod-validated environment that fails fast. Secrets come only from `process.env`, and `.env*` is git-ignored except `.env.example`.
- bcrypt (cost 12) password hashes. Email OTPs are stored hashed, with an expiry and an attempt limit.
- JWT in an `httpOnly` cookie with `Secure` and `SameSite=Lax`. Token versioning allows revocation.
- `.strict()` Zod validation on every endpoint, an Origin check on mutations, DB-backed rate limiting, and a honeypot plus optional Turnstile on public forms.
- CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are set in `next.config.ts`.
- Uploads are checked by magic bytes and size, and images are re-encoded (stripping EXIF and polyglots). PDFs are re-checked for `%PDF-` after upload.
- **Upload provenance:** stored file URLs must be UploadThing URLs whose key is tracked in `UploadedFile` and owned by the caller, so forged or borrowed URLs are rejected.
- **Club scoping:** a CLUB_ADMIN can manage and check in only at their own clubs. Check-in authorizes the door's event *before* looking up the ticket.
- **Concurrency safety:** seats are claimed with one atomic conditional `UPDATE`, check-ins with a conditional status flip, and counters are moved only by real row changes.
- CSV exports neutralize formula injection.
- Generic error messages, a structured logger that redacts secrets, and an audit log for admin actions.

## Deployment

Target: Vercel (Node.js runtime) with Neon.

1. Set every variable from the table above in the hosting dashboard.
   **Brevo:** if *Security → Authorised IPs* is enabled, Brevo rejects API calls from unlisted IPs with 401. Serverless hosts like Vercel have no fixed IP, so either disable that restriction or route email through a fixed-IP egress.
2. Build command: `npm run build`. Migrations: `npm run db:deploy`, run in CI or as a release step.
   `vercel.json` schedules `GET /api/cron/reminders` daily at 12:00 UTC (18:00 Dhaka); Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. UploadThing must be able to reach `/api/uploadthing` at the public URL.
3. After the hackathon, rotate the Neon password, Brevo key, UploadThing token, JWT secret and admin passwords.

## Folder structure

```
prisma/
  schema.prisma                 # full data model
  migrations/                   # init, raw-SQL full-text search, event bookmarks + sample flag
  seed.ts / seed-content.ts     # accounts + reference data / demo events, courses, resources
prisma.config.ts                # Prisma 7 CLI config (DIRECT_URL, migrations, seed)
scripts/cleanup-orphan-uploads.ts, scripts/send-reminders.ts
vercel.json                     # daily reminder cron
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
  config/chatbot-synonyms.ts    # English/Banglish/Bangla vocabulary → canonical search terms
  generated/prisma/             # Prisma client (generated, git-ignored)
  hooks/
  lib/                          # env, prisma, logger, errors, api-response, cache-tags
  lib/auth/                     # session JWT, RBAC, password policy, OTP primitives (pure)
  proxy.ts                      # Next 16 proxy (ex-middleware): JWT-only route protection
  server/
    services/                   # auth, user, otp, email, audit, upload, club, event, registration, resource, academic,
                                #   notification, chatbot (+intents, llm), knowledge (+sync), bus, notice/forms, follow,
                                #   lost-found, complaint, platform (search log, reminders, users, audit, revalidate)
    queries/                    # tag-cached reads ("use cache"): events, clubs, resources, helpdesk, bus/notices/forms,
                                #   lost & found, global search, admin stats, sitemap
    domain/                     # pure rules: registration, check-in, bus timetable, tickets, lost & found
    chatbot/                    # pure chatbot pipeline: normalize, intents, retrieval SQL, confidence, compose
    search/                     # parameterised resource search query builder
    upload/                     # image pipeline (magic bytes → resize → compress)
    repositories/               # Prisma queries with safe selects
    validators/                 # strict Zod schemas
    middleware/                 # requireAuth/Role, rate limits, request & bot guards, cookies
    security/                   # rate-limiter core, client IP, form-timing token
    email/                      # branded email layout + templates
  app/api/uploadthing/          # UploadThing FileRouter (pdfUploader)
  types/                        # shared types (API envelope)
tests/unit/                     # vitest unit tests
```
