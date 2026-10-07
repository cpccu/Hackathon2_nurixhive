import { z } from "zod";
import type { BusDirection } from "@/generated/prisma/enums";

/**
 * Bus timetable maths (pure, Asia/Dhaka = UTC+6, no DST).
 *
 * A route stores its stops in TO_CAMPUS order with `offsetMinutes` from the first
 * stop (first = 0, last = campus). A TO_CAMPUS trip reaches stop S at
 * departure + offset(S); a FROM_CAMPUS trip leaves campus and reaches S at
 * departure + (total - offset(S)).
 */

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;

export interface BusStop {
  name: string;
  offsetMinutes: number;
}

export const busStopsSchema = z
  .array(z.object({ name: z.string().trim().min(2).max(80), offsetMinutes: z.number().int().min(0).max(300) }).strict())
  .min(2)
  .max(30)
  .refine((stops) => stops[0]?.offsetMinutes === 0, { message: "The first stop must have offsetMinutes 0." })
  .refine((stops) => stops.every((stop, i) => i === 0 || stop.offsetMinutes > stops[i - 1].offsetMinutes), {
    message: "Stop offsets must strictly increase.",
  });

export const departureTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h).");

export interface TripLike {
  id: string;
  departureTime: string;
  direction: BusDirection;
  /** 0 = Sunday ... 6 = Saturday (Dhaka calendar). */
  daysOfWeek: number[];
  isActive: boolean;
}

export interface Departure {
  tripId: string;
  direction: BusDirection;
  /** Stop the time refers to (route start/campus when no stop was asked for). */
  stop: string;
  /** Local Dhaka clock time at that stop, "HH:mm". */
  time: string;
  /** Absolute instant (UTC ISO when serialised). */
  at: Date;
  /** 0 = today, 1 = tomorrow, ... (Dhaka calendar). */
  dayOffset: number;
  minutesUntil: number;
}

export interface DhakaClock {
  dayOfWeek: number;
  minutes: number;
  /** UTC instant of Dhaka midnight today. */
  midnight: number;
}

export function dhakaClock(now: Date): DhakaClock {
  const local = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return {
    dayOfWeek: local.getUTCDay(),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    midnight: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - DHAKA_OFFSET_MS,
  };
}

export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const toClock = (minutes: number) => {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Case-insensitive stop lookup ("gabtoli" matches "Gabtoli Bus Terminal"). */
export function findStop(stops: BusStop[], query: string): BusStop | null {
  const needle = query.trim().toLowerCase();
  return stops.find((stop) => stop.name.toLowerCase() === needle) ?? stops.find((stop) => stop.name.toLowerCase().includes(needle)) ?? null;
}

/** Minutes after the trip's departure at which it reaches `stop`. */
export function minutesToStop(direction: BusDirection, stops: BusStop[], stop: BusStop): number {
  const total = stops[stops.length - 1].offsetMinutes;
  return direction === "TO_CAMPUS" ? stop.offsetMinutes : total - stop.offsetMinutes;
}

interface NextOptions {
  stop?: BusStop | null;
  direction?: BusDirection;
  limit?: number;
  /** How many days ahead to look (Friday-off routes need > 1). */
  lookaheadDays?: number;
}

/** Next departures (at a stop, or at each trip's origin) from `now`, soonest first. */
export function nextDepartures(trips: TripLike[], stops: BusStop[], now: Date, options: NextOptions = {}): Departure[] {
  const clock = dhakaClock(now);
  const { stop = null, direction, limit = 3, lookaheadDays = 7 } = options;
  const results: Departure[] = [];

  for (let dayOffset = 0; dayOffset <= lookaheadDays && results.length < limit; dayOffset++) {
    const dayOfWeek = (clock.dayOfWeek + dayOffset) % 7;
    const sameDay: Departure[] = [];
    for (const trip of trips) {
      if (!trip.isActive || !trip.daysOfWeek.includes(dayOfWeek)) continue;
      if (direction && trip.direction !== direction) continue;
      const origin = trip.direction === "TO_CAMPUS" ? stops[0] : stops[stops.length - 1];
      const at = stop ?? origin;
      const minutes = toMinutes(trip.departureTime) + minutesToStop(trip.direction, stops, at);
      if (dayOffset === 0 && minutes < clock.minutes) continue;
      const instant = clock.midnight + dayOffset * DAY_MS + minutes * 60_000;
      sameDay.push({
        tripId: trip.id,
        direction: trip.direction,
        stop: at.name,
        time: toClock(minutes),
        at: new Date(instant),
        dayOffset,
        minutesUntil: Math.round((instant - now.getTime()) / 60_000),
      });
    }
    sameDay.sort((a, b) => a.at.getTime() - b.at.getTime());
    results.push(...sameDay);
  }
  return results.slice(0, limit);
}

/** All of today's active trips (Dhaka day), in departure order, including ones already gone. */
export function todaysTrips<T extends TripLike>(trips: T[], now: Date): T[] {
  const { dayOfWeek } = dhakaClock(now);
  return trips
    .filter((trip) => trip.isActive && trip.daysOfWeek.includes(dayOfWeek))
    .sort((a, b) => toMinutes(a.departureTime) - toMinutes(b.departureTime));
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function describeDay(dayOffset: number, at: Date): string {
  if (dayOffset === 0) return "today";
  if (dayOffset === 1) return "tomorrow";
  return DAY_NAMES[dhakaClock(at).dayOfWeek];
}

/** "Sat–Thu" style summary of operating days. */
export function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => ((a + 1) % 7) - ((b + 1) % 7));
  if (sorted.length === 7) return "every day";
  return sorted.map((d) => DAY_NAMES[d].slice(0, 3)).join(", ");
}
