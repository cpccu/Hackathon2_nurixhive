import { revalidateTag } from "next/cache";

/**
 * Single source of truth for cache tags (documented in README "Caching tag map").
 *
 * Reads: cached fetchers use `"use cache"` + `cacheLife("max")` + `cacheTag(...)`.
 * Writes: every mutation calls the matching `revalidate*` helper below.
 * There is deliberately NO time-based revalidation - data changes only on mutation.
 */
export const CacheTags = {
  // Events & clubs
  events: "events",
  event: (id: string) => `event:${id}`,
  clubs: "clubs",
  club: (id: string) => `club:${id}`,
  forms: "forms",

  // Academic resources
  resources: "resources",
  resource: (id: string) => `resource:${id}`,
  departments: "departments",
  courses: "courses",

  // Notices
  notices: "notices",
  notice: (id: string) => `notice:${id}`,

  // Transport
  buses: "buses",
  busRoute: (id: string) => `bus:${id}`,

  // Knowledge base / chatbot
  kb: "kb",
  kbEntry: (id: string) => `kb:${id}`,

  // Lost & found
  lostFound: "lost-found",
  lostFoundItem: (id: string) => `lf:${id}`,

  // Aggregates shown on landing page / dashboards
  stats: "stats",
} as const;

/** Stale-while-revalidate: visitors get the cached copy while the fresh one renders. */
const REVALIDATE_PROFILE = "max";

/** Revalidates every given tag. Use the domain helpers below in services. */
export function revalidateTags(...tags: string[]): void {
  for (const tag of new Set(tags)) {
    revalidateTag(tag, REVALIDATE_PROFILE);
  }
}

/** List tag + optional detail tag + landing stats. */
function revalidateCollection(listTag: string, detailTag?: string): void {
  revalidateTags(listTag, CacheTags.stats, ...(detailTag ? [detailTag] : []));
}

export const revalidateEvents = (id?: string) =>
  revalidateCollection(CacheTags.events, id && CacheTags.event(id));

/** Club changes also affect event cards (club name/logo) and form listings. */
export const revalidateClubs = (id?: string) => {
  revalidateCollection(CacheTags.clubs, id && CacheTags.club(id));
  revalidateTags(CacheTags.events, CacheTags.forms);
};

export const revalidateForms = () => revalidateTags(CacheTags.forms);

export const revalidateResources = (id?: string) =>
  revalidateCollection(CacheTags.resources, id && CacheTags.resource(id));

/** Department/course renames appear on resources and notices. */
export const revalidateAcademics = () =>
  revalidateTags(CacheTags.departments, CacheTags.courses, CacheTags.resources, CacheTags.notices);

export const revalidateNotices = (id?: string) =>
  revalidateCollection(CacheTags.notices, id && CacheTags.notice(id));

/** Bus data also feeds chatbot answers (KB entries sourced from routes). */
export const revalidateBuses = (id?: string) => {
  revalidateCollection(CacheTags.buses, id && CacheTags.busRoute(id));
  revalidateTags(CacheTags.kb);
};

export const revalidateKnowledgeBase = (id?: string) =>
  revalidateCollection(CacheTags.kb, id && CacheTags.kbEntry(id));

export const revalidateLostFound = (id?: string) =>
  revalidateCollection(CacheTags.lostFound, id && CacheTags.lostFoundItem(id));

export const revalidateStats = () => revalidateTags(CacheTags.stats);
