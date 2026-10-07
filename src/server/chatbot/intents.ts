import { conceptOf, type NormalizedMessage } from "@/server/chatbot/normalize";

/**
 * Deterministic intents answered from structured tables (real-time, never from
 * free text). Detection is pure keyword logic over normalised concepts.
 */
export type ChatIntent = "NEXT_BUS" | "BUS_TODAY" | "OPEN_FORMS" | "EVENTS_THIS_WEEK" | "CLASS_CANCELLATION";

export interface DetectedIntent {
  intent: ChatIntent;
  /** Tokens that might name a bus route or stop (e.g. "dhanmondi", "r2"). */
  routeHints: string[];
}

const has = (message: NormalizedMessage, ...concepts: string[]) => concepts.every((c) => message.concepts.has(c));
const hasAny = (message: NormalizedMessage, ...concepts: string[]) => concepts.some((c) => message.concepts.has(c));

/** Words that describe a bus question rather than name a place. */
const BUS_NOISE = new Set(["bus", "buses", "shuttle", "next", "today", "schedule", "time", "route", "stop", "campus", "university", "city", "leave", "leaves", "departure", "go", "goes", "kokhon", "kobe", "porer", "aj", "aaj", "ajke", "jabe", "chare", "chhare", "ছাড়বে", "যাবে"]);

export function detectIntent(message: NormalizedMessage): DetectedIntent | null {
  const routeHints = message.tokens.filter((token) => !BUS_NOISE.has(token) && !conceptOf(token));

  if (message.concepts.has("bus")) {
    if (message.concepts.has("today")) return { intent: "BUS_TODAY", routeHints };
    if (hasAny(message, "next", "when")) return { intent: "NEXT_BUS", routeHints };
    if (message.concepts.has("schedule")) return { intent: "BUS_TODAY", routeHints };
    return null;
  }
  if (has(message, "class", "cancel") || has(message, "notice", "cancel")) {
    return { intent: "CLASS_CANCELLATION", routeHints: [] };
  }
  if (message.concepts.has("form") && hasAny(message, "open", "deadline", "next", "when")) {
    return { intent: "OPEN_FORMS", routeHints: [] };
  }
  if (message.concepts.has("deadline") && !message.concepts.has("fee")) {
    return { intent: "OPEN_FORMS", routeHints: [] };
  }
  if (message.concepts.has("event") && hasAny(message, "week", "next", "today", "when")) {
    return { intent: "EVENTS_THIS_WEEK", routeHints: [] };
  }
  return null;
}

/** Picks the route whose code or name best matches the hints (null when ambiguous/absent). */
export function matchRoute<T extends { code: string; name: string; stopNames: string[] }>(hints: string[], routes: T[]): T | null {
  if (hints.length === 0) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const route of routes) {
    const haystack = [route.code, route.name, ...route.stopNames].join(" ").toLowerCase();
    const score = hints.filter((hint) => hint.length >= 2 && (hint === route.code.toLowerCase() || haystack.includes(hint))).length;
    if (score > bestScore) {
      best = route;
      bestScore = score;
    }
  }
  return best;
}
