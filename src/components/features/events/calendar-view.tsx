"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CalendarEventRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  startAt: string;
  venue: string;
  club: { name: string; slug: string };
}

const WEEKDAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const dhakaParts = (value: Date) => {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(value).split("-").map(Number);
  return { year, month, day };
};
const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** Month grid (Dhaka calendar, week starts Saturday). Cancelled events are struck through. */
export function CalendarView({ clubSlug, type }: { clubSlug?: string; type?: string }) {
  const [cursor, setCursor] = useState(() => {
    const today = dhakaParts(new Date());
    return { year: today.year, month: today.month };
  });
  const key = monthKey(cursor.year, cursor.month);

  const query = useQuery({ queryKey: ["events", "calendar", key], queryFn: () => api.get<{ month: string; events: CalendarEventRow[] }>("/api/events/calendar", { query: { month: key } }) });

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEventRow[]>();
    for (const event of query.data?.events ?? []) {
      if (clubSlug && event.club.slug !== clubSlug) continue;
      if (type && event.type !== type) continue;
      const day = dhakaParts(new Date(event.startAt)).day;
      map.set(day, [...(map.get(day) ?? []), event]);
    }
    return map;
  }, [query.data, clubSlug, type]);

  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  // Saturday-first offset: JS getUTCDay() Sat=6 → 0.
  const offset = (new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay() + 1) % 7;
  const today = dhakaParts(new Date());
  const isThisMonth = today.year === cursor.year && today.month === cursor.month;
  const title = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(cursor.year, cursor.month - 1, 1)));

  const shift = (delta: number) => {
    const date = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1));
    setCursor({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });
  };

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <section aria-label={`Events in ${title}`} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h3 font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCursor({ year: today.year, month: today.month })}>
            Today
          </Button>
          <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <Skeleton className="h-[34rem] rounded-2xl" />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
            <div className="grid grid-cols-7 border-b border-border bg-surface-2 text-center text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2.5">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: offset }, (_, i) => (
                <div key={`pad-${i}`} className="min-h-28 border-b border-r border-border/60 bg-surface-2/40" aria-hidden />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const events = byDay.get(day) ?? [];
                const isToday = isThisMonth && today.day === day;
                return (
                  <div key={day} className="min-h-28 border-b border-r border-border/60 p-1.5">
                    <span className={cn("mb-1 inline-grid size-7 place-items-center rounded-full text-sm font-semibold", isToday ? "bg-primary text-primary-fg" : "text-fg-muted")}>{day}</span>
                    <ul className="space-y-1">
                      {events.slice(0, 3).map((event) => (
                        <li key={event.id}>
                          <Link
                            href={`/events/${event.slug}`}
                            className={cn(
                              "block truncate rounded-md bg-primary-soft px-1.5 py-1 text-xs font-medium text-primary-soft-fg transition hover:brightness-95",
                              event.status === "CANCELLED" && "bg-danger-soft text-danger line-through",
                            )}
                            title={`${event.title} · ${formatTime(event.startAt)} · ${event.venue}`}
                          >
                            {formatTime(event.startAt)} {event.title}
                          </Link>
                        </li>
                      ))}
                      {events.length > 3 && <li className="px-1 text-xs text-fg-subtle">+{events.length - 3} more</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <ol className="space-y-2 md:hidden">
            {[...byDay.entries()]
              .sort(([a], [b]) => a - b)
              .map(([day, events]) => (
                <li key={day} className="rounded-2xl border border-border bg-surface p-3">
                  <p className="mb-2 text-sm font-semibold text-fg-muted">
                    {day} {title}
                  </p>
                  <ul className="space-y-2">
                    {events.map((event) => (
                      <li key={event.id}>
                        <Link href={`/events/${event.slug}`} className={cn("block rounded-xl bg-surface-2 p-3 transition hover:bg-primary-soft", event.status === "CANCELLED" && "line-through opacity-70")}>
                          <span className="block text-xs text-fg-subtle">
                            {formatTime(event.startAt)} · {event.venue}
                          </span>
                          <span className="font-semibold">{event.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            {byDay.size === 0 && <li className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-fg-muted">No events this month.</li>}
          </ol>
        </>
      )}
    </section>
  );
}
