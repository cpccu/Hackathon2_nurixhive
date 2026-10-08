"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { BusFinder } from "@/components/features/bus/bus-finder";
import { type BusRouteData, DIRECTION_LABEL } from "@/components/features/bus/bus-types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatClock } from "@/lib/format";
import { dhakaClock, describeDays, toMinutes, todaysTrips } from "@/server/domain/bus-schedule";
import { cn } from "@/lib/utils";

/** Live part of the route page: next-bus finder + today's timetable with past trips dimmed. */
export function RouteLive({ initial }: { initial: BusRouteData }) {
  const route = useQuery({ queryKey: ["bus", "route", initial.code], queryFn: () => api.get<BusRouteData>(`/api/bus/routes/${initial.code}`), initialData: initial, staleTime: 5 * 60_000 });
  if (route.isError) return <ErrorState error={route.error} onRetry={() => void route.refetch()} />;
  if (!route.data) return <Skeleton className="h-96 rounded-3xl" />;

  const now = new Date();
  const nowMinutes = dhakaClock(now).minutes;
  const today = todaysTrips(route.data.trips, now);

  return (
    <div className="space-y-8">
      <BusFinder routes={[route.data]} fixedRoute={route.data.code} />
      <section aria-labelledby="timetable-heading" className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-soft-fg">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <h2 id="timetable-heading" className="font-display text-h3 font-bold">
              Today&apos;s timetable
            </h2>
            <p className="text-sm text-fg-muted">Departure from the first stop (to campus) or from campus.</p>
          </div>
        </div>
        {today.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-4 text-fg-muted">No trips run today. Check the weekly pattern below.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {today.map((trip) => {
              const gone = toMinutes(trip.departureTime) < nowMinutes;
              return (
                <li key={trip.id} className={cn("flex items-center justify-between rounded-xl border border-border p-3", gone && "opacity-50")}>
                  <span className="font-display text-lg font-bold tabular-nums">{formatClock(trip.departureTime)}</span>
                  <Badge tone={trip.direction === "TO_CAMPUS" ? "primary" : "accent"}>{DIRECTION_LABEL[trip.direction]}</Badge>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-fg-subtle">Runs {describeDays([...new Set(route.data.trips.flatMap((trip) => trip.daysOfWeek))])}.</p>
      </section>
    </div>
  );
}
