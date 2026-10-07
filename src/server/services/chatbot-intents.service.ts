import { hourBucket } from "@/lib/time";
import type { AnswerSource } from "@/server/chatbot/compose";
import { type ChatIntent, type DetectedIntent, matchRoute } from "@/server/chatbot/intents";
import { describeDay, findStop, nextDepartures, todaysTrips } from "@/server/domain/bus-schedule";
import { type BusRouteView, getBusRoutes, getNotices, getOpenForms } from "@/server/queries/campus.queries";
import { getPublicEvents } from "@/server/queries/event.queries";

/**
 * Real-time answers for deterministic intents, built from structured tables
 * (bus trips, forms, events, notices) and the current Asia/Dhaka time - never
 * from free text, so they can't drift from the source of truth.
 */

export interface IntentAnswer {
  intent: ChatIntent;
  answer: string;
  sources: AnswerSource[];
}

const DHAKA = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short" });
const formatWhen = (date: Date) => DHAKA.format(date);

const link = (title: string, href: string): AnswerSource => ({ id: href, title, category: "GENERAL", link: href });

const directionLabel = (direction: "TO_CAMPUS" | "FROM_CAMPUS") => (direction === "TO_CAMPUS" ? "to campus" : "from campus");

function routeChoices(routes: BusRouteView[]) {
  return routes.map((route) => ({ ...route, stopNames: route.stops.map((stop) => stop.name) }));
}

function minutesText(minutes: number): string {
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours} h ${minutes % 60} min`;
}

async function nextBus(hints: string[], now: Date): Promise<IntentAnswer | null> {
  const routes = await getBusRoutes();
  if (routes.length === 0) return null;
  const route = matchRoute(hints, routeChoices(routes));

  if (!route) {
    const lines = routes
      .map((r) => {
        const [next] = nextDepartures(r.trips, r.stops, now, { limit: 1 });
        return next ? `• ${r.code} ${r.name}: ${next.time} ${describeDay(next.dayOffset, next.at)} (${directionLabel(next.direction)})` : null;
      })
      .filter(Boolean);
    return {
      intent: "NEXT_BUS",
      answer: `Next departures on every route:\n${lines.join("\n")}\nTell me your area (e.g. "next bus to Mirpur") for a specific route.`,
      sources: [link("Bus schedule", "/bus")],
    };
  }

  const stop = hints.map((hint) => findStop(route.stops, hint)).find(Boolean) ?? null;
  const departures = nextDepartures(route.trips, route.stops, now, { stop, limit: 3 });
  if (departures.length === 0) {
    return { intent: "NEXT_BUS", answer: `Route ${route.code} (${route.name}) has no scheduled departures in the next week.`, sources: [link(`Route ${route.code}`, `/bus?route=${route.code}`)] };
  }
  const where = stop ? ` at ${stop.name}` : "";
  const lines = departures.map(
    (d) => `• ${d.time} ${describeDay(d.dayOffset, d.at)}${d.dayOffset === 0 ? ` (${minutesText(d.minutesUntil)})` : ""} - ${directionLabel(d.direction)}${stop ? "" : ` from ${d.stop}`}`,
  );
  return {
    intent: "NEXT_BUS",
    answer: `Next ${route.code} ${route.name} buses${where}:\n${lines.join("\n")}`,
    sources: [link(`Route ${route.code} - ${route.name}`, `/bus?route=${route.code}`)],
  };
}

async function busToday(hints: string[], now: Date): Promise<IntentAnswer | null> {
  const routes = await getBusRoutes();
  if (routes.length === 0) return null;
  const matched = matchRoute(hints, routeChoices(routes));
  const selected = matched ? [matched] : routes;

  const lines = selected.flatMap((route) => {
    const trips = todaysTrips(route.trips, now);
    if (trips.length === 0) return [];
    const toCampus = trips.filter((t) => t.direction === "TO_CAMPUS").map((t) => t.departureTime);
    const fromCampus = trips.filter((t) => t.direction === "FROM_CAMPUS").map((t) => t.departureTime);
    return [`• ${route.code} ${route.name}: to campus ${toCampus.join(", ") || "-"}; from campus ${fromCampus.join(", ") || "-"}`];
  });

  const today = DHAKA_DATE.format(now);
  if (lines.length === 0) {
    const next = selected.flatMap((route) => nextDepartures(route.trips, route.stops, now, { limit: 1 }).map((d) => ({ route, d })));
    next.sort((a, b) => a.d.at.getTime() - b.d.at.getTime());
    const resume = next[0] ? ` Service resumes ${describeDay(next[0].d.dayOffset, next[0].d.at)} at ${next[0].d.time} (${next[0].route.code}).` : "";
    return { intent: "BUS_TODAY", answer: `No buses run today (${today}).${resume}`, sources: [link("Bus schedule", "/bus")] };
  }
  return { intent: "BUS_TODAY", answer: `Bus schedule for today (${today}):\n${lines.join("\n")}`, sources: [link("Bus schedule", "/bus")] };
}

async function openForms(): Promise<IntentAnswer> {
  const { items } = await getOpenForms({ limit: 5 }, hourBucket());
  if (items.length === 0) return { intent: "OPEN_FORMS", answer: "There are no open forms right now.", sources: [link("Forms & deadlines", "/forms")] };
  const lines = items.map((form) => `• ${form.title}${form.club ? ` (${form.club.name})` : ""} - ${form.deadline ? `deadline ${formatWhen(form.deadline)}` : "no deadline"}`);
  return { intent: "OPEN_FORMS", answer: `Open forms:\n${lines.join("\n")}`, sources: [link("Forms & deadlines", "/forms")] };
}

async function eventsThisWeek(now: Date): Promise<IntentAnswer> {
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { items } = await getPublicEvents({ when: "upcoming", dateTo: weekAhead, limit: 6 }, hourBucket(now));
  if (items.length === 0) return { intent: "EVENTS_THIS_WEEK", answer: "No events are scheduled in the next 7 days.", sources: [link("Events", "/events")] };
  const lines = items.map((event) => `• ${event.title} - ${formatWhen(event.startAt)}, ${event.venue} (${event.club.name})`);
  return {
    intent: "EVENTS_THIS_WEEK",
    answer: `Events in the next 7 days:\n${lines.join("\n")}`,
    sources: items.slice(0, 3).map((event) => link(event.title, `/events/${event.slug}`)),
  };
}

async function classCancellations(): Promise<IntentAnswer> {
  const { items } = await getNotices({ category: "CLASS_CANCELLATION", limit: 3 }, hourBucket());
  if (items.length === 0) {
    return { intent: "CLASS_CANCELLATION", answer: "There are no class cancellation notices right now.", sources: [link("Notices", "/notices?category=CLASS_CANCELLATION")] };
  }
  const lines = items.map((notice) => `• ${notice.title}${notice.course ? ` (${notice.course.code})` : ""} - posted ${formatWhen(notice.createdAt)}`);
  return {
    intent: "CLASS_CANCELLATION",
    answer: `Latest class cancellations:\n${lines.join("\n")}`,
    sources: items.map((notice) => link(notice.title, `/notices/${notice.id}`)),
  };
}

/** Answers a detected intent from live data; null means "fall back to the knowledge base". */
export async function answerIntent(detected: DetectedIntent, now: Date = new Date()): Promise<IntentAnswer | null> {
  switch (detected.intent) {
    case "NEXT_BUS":
      return nextBus(detected.routeHints, now);
    case "BUS_TODAY":
      return busToday(detected.routeHints, now);
    case "OPEN_FORMS":
      return openForms();
    case "EVENTS_THIS_WEEK":
      return eventsThisWeek(now);
    case "CLASS_CANCELLATION":
      return classCancellations();
  }
}
