import { AlertTriangle, ArrowRight, Bus, CalendarDays, FileText, HelpCircle, Megaphone, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { DepartureCountdown } from "@/components/features/bus/departure-countdown";
import { EventCard } from "@/components/features/events/event-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { formatClock, formatRelative } from "@/lib/format";
import { labelOf, NOTICE_CATEGORY } from "@/lib/labels";
import { hourBucket } from "@/lib/time";
import { cn } from "@/lib/utils";
import { nextDepartures } from "@/server/domain/bus-schedule";
import { getBusRoutes, getNotices } from "@/server/queries/campus.queries";
import { getPublicEvents } from "@/server/queries/event.queries";
import { getPublicStats } from "@/server/queries/platform.queries";

/*
 * Live landing sections. Each awaits `connection()` (request time) and then
 * reads tag-cached data, so they stream into the static shell in ~ms without
 * time-based revalidation.
 */

export async function LiveStats() {
  await connection();
  const stats = await getPublicStats(hourBucket());
  const items = [
    { label: "Upcoming events", value: stats.upcomingEvents, icon: <CalendarDays />, tone: "primary" as const, hint: "Across all clubs" },
    { label: "Notes & questions", value: stats.resources, icon: <FileText />, tone: "saffron" as const, hint: "Peer-reviewed uploads" },
    { label: "Active clubs", value: stats.clubs, icon: <Users />, tone: "accent" as const, hint: "Find your people" },
    { label: "Verified answers", value: stats.helpdeskAnswers, icon: <HelpCircle />, tone: "info" as const, hint: `${stats.busRoutes} bus routes covered` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} className="glass" />
      ))}
    </div>
  );
}

export function LiveStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[8.5rem] rounded-2xl" />
      ))}
    </div>
  );
}

export async function WeekEvents() {
  await connection();
  const bucket = hourBucket();
  let page = await getPublicEvents({ when: "thisWeek", limit: 8 }, bucket);
  let label = "This week";
  if (page.items.length === 0) {
    page = await getPublicEvents({ when: "upcoming", limit: 8 }, bucket);
    label = "Coming up";
  }
  if (page.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/60 p-10 text-center text-fg-muted">
        No events scheduled yet - clubs publish new ones every week. <Link href="/clubs" className="font-semibold text-primary hover:underline">Browse clubs</Link>
      </div>
    );
  }
  return (
    <div>
      <p className="sr-only">{label}</p>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 2xl:grid-cols-4">
        {page.items.slice(0, 8).map((event, index) => (
          <li key={event.id} className={cn("w-[82%] shrink-0 snap-start sm:w-[45%] lg:w-auto", index >= 6 && "lg:hidden 2xl:block")}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function NextBusWidget() {
  await connection();
  const now = new Date();
  const routes = await getBusRoutes();
  const rows = routes
    .map((route) => ({ route, next: nextDepartures(route.trips, route.stops, now, { direction: "TO_CAMPUS", limit: 1 })[0] }))
    .filter((row): row is typeof row & { next: NonNullable<typeof row.next> } => Boolean(row.next))
    .sort((a, b) => a.next.at.getTime() - b.next.at.getTime())
    .slice(0, 4);

  return (
    <div className="glass flex h-full flex-col rounded-3xl p-5 shadow-md sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-soft-fg">
            <Bus className="size-[1.1rem]" />
          </span>
          Next buses to campus
        </h3>
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Dhaka time
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-sm text-fg-muted">No upcoming trips in the next 7 days.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ route, next }) => (
            <li key={route.id}>
              <Link href={`/bus/${route.code}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3 transition hover:border-accent/50 hover:bg-surface">
                <span className="grid h-10 min-w-12 place-items-center rounded-xl bg-brand-gradient px-2 font-display text-sm font-bold text-white">{route.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{route.name}</span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {next.stop} · {formatClock(next.time)}
                    {next.dayOffset === 1 ? " tomorrow" : next.dayOffset > 1 ? ` in ${next.dayOffset} days` : ""}
                  </span>
                </span>
                <DepartureCountdown at={next.at.toISOString()} fallback={formatClock(next.time)} className="shrink-0 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-soft-fg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/bus" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        Full timetable & stop finder <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="glass space-y-3 rounded-3xl p-6">
      <Skeleton className="h-6 w-1/2" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

export async function NoticesTicker() {
  await connection();
  const now = new Date();
  const { items } = await getNotices({ limit: 8 }, hourBucket(now));
  if (items.length === 0) return null;
  const urgent = (category: string) => category === "CLASS_CANCELLATION" || category === "URGENT";

  const row = (hidden: boolean) =>
    items.map((notice) => {
      const meta = labelOf(NOTICE_CATEGORY, notice.category);
      return (
        <li key={`${notice.id}-${hidden ? "b" : "a"}`} aria-hidden={hidden || undefined} className={cn("shrink-0", hidden && "motion-reduce:hidden")}>
          <Link
            href={`/notices/${notice.id}`}
            tabIndex={hidden ? -1 : undefined}
            className={cn("flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition hover:border-primary/40", urgent(notice.category) ? "border-danger/30 bg-danger-soft/60" : "border-border bg-surface")}
          >
            {urgent(notice.category) ? <AlertTriangle className="size-4 text-danger" aria-hidden /> : <Megaphone className="size-4 text-primary" aria-hidden />}
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="max-w-[22rem] truncate font-medium">{notice.title}</span>
            <span className="text-xs text-fg-subtle">{formatRelative(notice.createdAt, now)}</span>
          </Link>
        </li>
      );
    });

  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <ul aria-label="Latest notices" className="flex w-max gap-3 animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:overflow-x-auto">
        {row(false)}
        {row(true)}
      </ul>
    </div>
  );
}
