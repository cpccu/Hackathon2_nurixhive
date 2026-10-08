"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, BusFront, Clock } from "lucide-react";
import { useState } from "react";
import { type BusRouteData, DIRECTION_LABEL, type DepartureData } from "@/components/features/bus/bus-types";
import { DepartureCountdown } from "@/components/features/bus/departure-countdown";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatClock } from "@/lib/format";
import { describeDay } from "@/server/domain/bus-schedule";

interface NextResponse {
  route: { code: string; name: string };
  stop: string;
  departures: DepartureData[];
}

interface BusFinderProps {
  routes: BusRouteData[];
  /** Lock the finder to one route (route detail page). */
  fixedRoute?: string;
}

/** "When is my next bus?" - pick route, stop and direction; live countdown in Dhaka time. */
export function BusFinder({ routes, fixedRoute }: BusFinderProps) {
  const [routeCode, setRouteCode] = useState(fixedRoute ?? routes[0]?.code ?? "");
  const route = routes.find((item) => item.code === routeCode) ?? routes[0];
  const [stopName, setStopName] = useState<string>("");
  const [direction, setDirection] = useState<"TO_CAMPUS" | "FROM_CAMPUS">("TO_CAMPUS");
  const stop = route?.stops.find((item) => item.name === stopName) ?? route?.stops[0];

  const result = useQuery({
    queryKey: ["bus", "next", route?.code, stop?.name, direction],
    enabled: Boolean(route && stop),
    queryFn: () => api.get<NextResponse>("/api/bus/next", { query: { route: route?.code, stop: stop?.name, direction, limit: 4 } }),
    refetchInterval: 60_000,
  });

  if (!route) return <EmptyState title="No bus routes yet" description="Routes will appear here once they are published." icon={<BusFront />} />;

  return (
    <section aria-label="Next bus finder" className="rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-soft-fg">
          <Clock className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-h3 font-bold">Next bus finder</h2>
          <p className="text-sm text-fg-muted">Times are Asia/Dhaka. Fridays and holidays roll to the next service day.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {!fixedRoute && (
          <Field label="Route">
            <Select
              value={route.code}
              onChange={(event) => {
                setRouteCode(event.target.value);
                setStopName("");
              }}
            >
              {routes.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Your stop">
          <Select value={stop?.name ?? ""} onChange={(event) => setStopName(event.target.value)}>
            {route.stops.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Direction">
          <div className="flex rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label="Direction">
            {(["TO_CAMPUS", "FROM_CAMPUS"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={direction === value}
                onClick={() => setDirection(value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${direction === value ? "bg-surface text-primary shadow-sm" : "text-fg-muted hover:text-fg"}`}
              >
                {DIRECTION_LABEL[value]}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6" aria-live="polite">
        {result.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : result.isError ? (
          <ErrorState error={result.error} onRetry={() => void result.refetch()} />
        ) : result.data.departures.length === 0 ? (
          <EmptyState title="No upcoming buses found" description="This route has no active trips in this direction right now." icon={<ArrowRightLeft />} />
        ) : (
          <ul className="space-y-3">
            {result.data.departures.map((departure, index) => (
              <li key={`${departure.at}-${departure.direction}`} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${index === 0 ? "border-primary/40 bg-primary-soft/50" : "border-border"}`}>
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums">{formatClock(departure.time)}</p>
                  <p className="text-sm text-fg-muted">
                    {describeDay(departure.dayOffset, new Date(departure.at))} · at {departure.stop}
                  </p>
                </div>
                <div className="text-right">
                  <DepartureCountdown at={departure.at} fallback={`in ${departure.minutesUntil} min`} className="text-lg font-semibold text-primary" />
                  {index === 0 && <Badge tone="success" className="ml-2 align-middle">Next</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
