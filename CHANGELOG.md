# Changelog

All notable changes to CampusOS. Dates are Asia/Dhaka. Versions follow the milestones of the hackathon build; the app itself is not published to npm.

## 0.9.0 - Pre-submission fixes and campus calendar (2026-10-08)

### Added

- **Campus calendar rule** (`src/config/campus-calendar.ts`): City University is open Friday to Tuesday and closed Wednesday and Thursday, with no bus service on those days. Weekdays are always computed in Asia/Dhaka.
- `CampusClosure` model and migration `20261013000000_campus_calendar`; public `GET /api/calendar`; admin `GET|POST /api/admin/calendar/closures` and `PATCH|DELETE /api/admin/calendar/closures/{id}`; the "Campus calendar" admin page; permission `calendar:manage`; cache tag `calendar` (with `buses` and `kb`).
- Bus: `BUS_DAY_NOT_ALLOWED` validation and the database constraint `BusTrip_no_off_days`; off-day responses (`service`, `reason`, `message`, `nextServiceAt`) on `/api/bus/next` and `/api/bus/routes/{code}`; "No bus service today" UI with a weekday selector and a countdown only on service days.
- Chatbot: intents for "is the university open today/tomorrow", "next working day" and "which days does the bus run", in English, Banglish and Bangla.
- Events: `confirmOffDay` / `OFF_DAY_CONFIRMATION_REQUIRED`, off-day badges, Friday-first calendar, Friday to Thursday "This week" filter.
- `Resource.courseName` (migration `20261012000000_resource_course_name`) so a student can upload for a course that is not in the list.
- `docs/REQUIREMENTS_AUDIT.md`, `docs/SUBMISSION_CHECKLIST.md`, regression tests (`tests/unit/regressions.test.ts`, `tests/e2e/regressions.spec.ts`), calendar tests (`tests/unit/campus-calendar.test.ts`, `tests/e2e/campus-calendar.spec.ts`).

### Fixed

- **Maintenance page after login.** Signing in sent some users to "We will be right back". The e2e suite flipped the real, shared maintenance flag, and the proxy caches that flag, so the setting leaked to real visitors. The toggle test now runs only when `E2E_ALLOW_MAINTENANCE_TOGGLE=1`, and a regression test checks that login lands on the dashboard without the maintenance page.
- **Add to calendar.** The Google Calendar item opened in the same tab and replaced the event page. The dropdown now supports `external` links (`target="_blank"`, `rel="noopener noreferrer"`).
- **Custom course on resource upload.** The course list was the only choice. A "My course is not listed" toggle stores a typed course name; the API rejects a request that sends both `courseId` and `courseName`.
- **Lost & found status not refreshing.** After changing a post's status the board and "my posts" kept the old value until a reload. Mutations now call `invalidateLostFound`, which refreshes both lists.
- **Lost & found detail page prerender error.** The "possible matches" cards print the relative post time, which needs the request time. They are now rendered after `await connection()`.
- The "No bus service today" card faded in over 300 ms even for visitors who ask for reduced motion; it now appears instantly when `prefers-reduced-motion` is set (caught by the Playwright accessibility suite).
- Signup and login returned 403 when Cloudflare Turnstile was configured: the forms now render the Turnstile widget and send its token.
- Vercel build failed because build tools (Tailwind, TypeScript, Prisma, `@types/*`) were dev dependencies. They are regular dependencies now, `vercel.json` sets `buildCommand`, and `prisma migrate deploy` no longer runs during the build.
- Brevo errors are logged with the provider's message so a blocked IP is visible in the Vercel logs.
- The hero section overflowed on small screens; mobile now has a bottom tab bar and the hamburger is hidden below the `md` breakpoint.
- The week used to start on Saturday and Friday was treated as the weekly holiday. The old helper `dhakaWeekRange` was removed.

### Changed

- Seeded bus trips run Friday to Tuesday only; seeded events are never placed on Wednesday or Thursday.
- The knowledge base entries for buses state the working days and the no-service rule.
- Playwright blanks the Turnstile keys for its own test server only.

## 0.8.0 - Admin portal, hardening, performance (earlier)

- Admin console (events, clubs, resources, helpdesk, notices, forms, bus, lost & found, complaints, users, audit log, settings).
- Security review, rate limiting, Zod `.strict()` validation everywhere, tag-based cache invalidation, performance measurements, and the Playwright / axe suites.

## 0.1.0 - 0.7.0 - Foundation (earlier)

- Design system, auth with email OTP, events and clubs, resource hub, helpdesk and chatbot, bus schedule, notices and forms, lost & found, complaints.
