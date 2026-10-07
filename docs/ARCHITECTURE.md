# CampusOS Architecture

This document is the contract every later task follows. If code and this document disagree, fix one of them in the same change.

## 1. Shape of the system

One Next.js 16 (App Router) project serves pages **and** the JSON API (Route Handlers under `src/app/api`). It runs on the Node.js runtime, keeps no in-process state, and talks to Neon PostgreSQL through Prisma 7.

```
Browser ──► Next.js (CDN / ISR cache) ──► Server Components ──► cached fetchers ("use cache")
   │                                                                     │
   └──► /api/* Route Handlers ──► withApiHandler ──► validators (Zod) ──► services ──► repositories / Prisma ──► Neon
                                                                       └──► revalidate*() cache tags
```

### Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes / pages | `src/app/(public)`, `(auth)`, `(user)`, `admin`, `api` | HTTP + rendering only. No business rules. |
| Route wrapper | `src/lib/errors.ts` → `withApiHandler` | Request id, error → envelope mapping, generic 500s. |
| Request guards | `src/server/middleware/*` | Auth/role checks, Origin check, rate limit, Turnstile/honeypot. |
| Validators | `src/server/validators/*` | Zod schemas, always `.strict()`. Parse input once at the edge. |
| Services | `src/server/services/*` | Business rules, transactions, audit logging, cache revalidation. JSDoc on every exported function. |
| Repositories | `src/server/repositories/*` | Reusable Prisma queries with explicit `select`s (never return `passwordHash`, OTP hashes, `tokenVersion`). |
| Shared libs | `src/lib/*` | `env`, `prisma`, `logger`, `api-response`, `errors`, `cache-tags`. |
| Client-safe | `src/types/*`, `src/config/public-env.ts` | Types and `NEXT_PUBLIC_*` config only. |

### API envelope

Every endpoint returns (`src/types/api.ts`, built with `src/lib/api-response.ts`):

```json
{ "success": true, "data": {}, "meta": { "limit": 20, "nextCursor": "ck..." } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

Thrown `AppError` subclasses map to their status. `ZodError` maps to 400 `VALIDATION_ERROR`, Prisma `P2002` to 409, `P2025` to 404, and anything else to a logged, generic 500 `INTERNAL_ERROR`. Stack traces never leave the server. Every response carries `x-request-id`.

### Pagination and scale

- Lists use **cursor pagination** (`cursor` = last id, `limit` ≤ 50). `meta.nextCursor` is null on the last page. No `OFFSET` on hot lists.
- Each list query is backed by a compound index in `schema.prisma` that starts with its filter columns (for example `Event(status, startAt)` or `LostFoundItem(status, type, createdAt)`).
- Counters read on hot paths are denormalized and updated in the same transaction as the write: `Event.registrationCount`, `Club.memberCount`, `Resource.downloadCount/bookmarkCount`, `KnowledgeEntry.viewCount`, `ChatSession.messageCount`.
- `src/lib/prisma.ts` is a singleton. Runtime traffic uses the **pooled** `DATABASE_URL` through `@prisma/adapter-pg`; migrations use `DIRECT_URL` through `prisma.config.ts`.
- Soft delete (`deletedAt`) applies to user-facing content (User, Club, Event, Resource, KnowledgeEntry, BusRoute, Notice, FormLink, LostFoundItem). Every read filters `deletedAt: null`.

## 2. Caching: tag-based ISR only

Next.js 16 runs with `cacheComponents: true`. Public data is cached **until a mutation invalidates it**. There is no time-based revalidation.

**Reads.** Public pages call cached fetchers like this:

```ts
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache-tags";

export async function getPublishedEvents() {
  "use cache";
  cacheLife("max");            // no timer-driven refresh; tags drive freshness
  cacheTag(CacheTags.events);
  return eventRepository.listPublished();
}

export async function getEventBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  const event = await eventRepository.findBySlug(slug);
  if (event) cacheTag(CacheTags.event(event.id));   // tags can be added after the lookup
  return event;
}
```

**Writes.** Every service mutation (create, update, delete, status change, upload) calls the matching helper from `src/lib/cache-tags.ts`, for example `revalidateEvents(id)`. The helpers call `revalidateTag(tag, "max")`, which is stale-while-revalidate: the next visitor gets the cached page instantly and triggers a background refresh. Server Actions that need read-your-own-writes can use `updateTag` instead.

**What is never cached:** anything that depends on the current user (dashboards, notifications, my registrations, my complaints) or on cookies or headers. Those render dynamically inside `<Suspense>`.

**External trigger:** a `POST /api/revalidate` endpoint, guarded by `REVALIDATE_SECRET`, will accept a list of tags for ops use. It is added together with its README entry.

The full tag map is in README → *Caching tag map*. `src/lib/cache-tags.ts` is the single source of truth.

## 3. Authentication and authorization

- **Passwords:** bcryptjs, cost 12. Emails are stored lower-cased.
- **Sign-up:** the account is created with `isEmailVerified = false`. A 6-digit OTP (`crypto.randomInt`) is sent through Brevo. Only `HMAC-SHA256(JWT_SECRET, purpose:userId:code)` is stored in `EmailOtp`, together with `expiresAt` (10 min), an attempts counter (max 5) and `consumedAt`. A 60 s resend cooldown applies. Earlier codes are invalidated only after the new one is delivered, and an undelivered code is deleted, so a retry is never blocked. Password reset uses the same table with `purpose = PASSWORD_RESET`.
- **Session:** a JWT signed with `jose` (HS256, `JWT_SECRET`, expiry `JWT_EXPIRES_IN`). Claims: `sub` (user id), `role` and `tv` (token version). It is stored in a cookie with `httpOnly`, `Secure` in production, `SameSite=Lax` and `Path=/`.
- **Revocation:** logout-everywhere, password change and role change increment `User.tokenVersion`. Tokens whose `tv` does not match are rejected.
- **Brute force:** `failedLoginCount` and `lockedUntil` on User, plus DB-backed rate limits (see below).
- **Roles:** `USER < MODERATOR < CLUB_ADMIN < ADMIN < SUPER_ADMIN`. Club-scoped admin rights come from `ClubMember.role = ADMIN`. Guards live in `src/server/middleware` and are enforced in services too, not only in the UI.
- **CSRF:** `SameSite=Lax` plus an **Origin check** on every non-GET API request. The Origin (or Referer) must equal the `NEXT_PUBLIC_APP_URL` origin or the origin the request was addressed to.
- **Route protection:** `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`) only verifies the JWT, for fast redirects. Route handlers call `requireAuth` / `requireRole` / `requirePermission` (`src/server/middleware/auth.ts`), which re-check the database once per request.
- **Audit:** every admin/moderator mutation writes an `AuditLog` row (actor, action, entity, metadata, IP).

## 4. Rate limiting and bot protection

- `RateLimit(key, count, resetAt)` stores fixed-window counters. One atomic `INSERT … ON CONFLICT DO UPDATE` per check, keyed like `login:ip:<ip>` or `otp:user:<id>`, and expired rows are swept by a cron (`CRON_SECRET`).
- Public forms (sign-up, complaint, lost & found) include a hidden honeypot field. They also verify Cloudflare Turnstile when `TURNSTILE_SECRET_KEY` is set. When it is unset (local dev), only the honeypot applies.

## 5. Uploads

Every uploaded object gets an `UploadedFile` row (key, url, size, mime, kind, uploader) so orphans can be found and deleted.

| Kind | Flow |
| --- | --- |
| **Images** (event banners, club logos, lost & found photos, avatars) | 1. Client posts multipart to our API. 2. Server checks size limits and **magic bytes** (JPEG/PNG/WebP only). 3. `image-video-compressor` (sharp) re-encodes to WebP and strips EXIF, which also neutralizes polyglot files. 4. `UTApi.uploadFiles` (UploadThing, `UPLOADTHING_TOKEN`). 5. The returned URL and key are saved to `UploadedFile` and the owning record. |
| **PDFs** (resources, notice attachments) | UploadThing `FileRouter` with auth middleware (role check, size limit). `onUploadComplete` re-validates the type, records `UploadedFile`, and the resource row starts in `PENDING` moderation. |

Only UploadThing hosts (`utfs.io`, `*.ufs.sh`) are allowed in `next/image` and the CSP.

## 6. Search

- `pg_trgm` is enabled for typo-tolerant matching. GIN trigram indexes exist on `Resource.title` and `KnowledgeEntry.question`.
- `Resource.searchVector` and `KnowledgeEntry.searchVector` are **STORED generated tsvector columns**, so Postgres keeps them current on every write. Weighting: title/question and tags/keywords get weight A, description/answer gets weight B. Each has a GIN index. They are defined in `prisma/migrations/*_fulltext_search` and declared as `Unsupported("tsvector") @default(dbgenerated())` in the schema, so Prisma sees no drift.
- Queries go through `$queryRaw` with `websearch_to_tsquery('english', $1)` and `ts_rank`, always parameterized and never built with string concatenation.

## 7. Chatbot ("Ask CampusOS")

Retrieval first, with the LLM optional:

1. Normalize the question, then search `KnowledgeEntry` (published, not deleted) by full-text rank combined with trigram similarity.
2. Compute a confidence score from 0 to 1 using the top rank and the gap to the runner-up.
3. **High confidence:** return the stored answer and list the matched entry ids.
   **Medium confidence:** if `LLM_API_KEY` is set, ask the LLM to answer **only from the top-k retrieved entries** (grounded, with citations). Otherwise, return the top matches as suggestions.
   **Low confidence:** reply with a "not sure" message and point to the right office or notice.
4. Persist `ChatMessage` rows (`matchedEntryIds`, `confidence`, `isAnswered`). Admins see an **unanswered questions** view (`isAnswered = false`) and turn the gaps into new KB entries. Those entries are cached under the `kb` tag and revalidated on edit.
5. Domain data feeds the KB through `sourceType`/`sourceRefId`: bus routes, notices and events can generate entries, and the matching revalidation helpers also bust `kb`.

The chatbot endpoint is rate limited per IP and per user, and user text is never rendered as HTML.

## 8. Email

Brevo REST `POST https://api.brevo.com/v3/smtp/email` via native `fetch`, with the `api-key: BREVO_API_KEY` header and sender `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME`. Failures are logged without the recipient's OTP and surface to the user as a generic message.

## 9. Security checklist (applies to every endpoint)

- `.strict()` Zod validation of body, query and params.
- Auth/role guard, an Origin check for mutations, and a rate limit.
- An explicit Prisma `select` on every query, with no secret fields in the output.
- Generic error messages, with details only in the server logs. `src/lib/logger.ts` redacts keys containing password, token, secret, cookie, otp and similar.
- Security headers and a CSP set in `next.config.ts`. No `dangerouslySetInnerHTML` with user content.
- Secrets only come from `src/lib/env.ts`, which is Zod-validated and fails fast. The client only ever sees `NEXT_PUBLIC_*` values through `src/config/public-env.ts`.
