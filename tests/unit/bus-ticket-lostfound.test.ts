import { describe, expect, it } from "vitest";
import {
  busStopsSchema,
  describeDays,
  dhakaClock,
  findStop,
  nextDepartures,
  todaysTrips,
  type TripLike,
} from "@/server/domain/bus-schedule";
import { canSeeContact, canTransition, claimBlocker, matchScore } from "@/server/domain/lost-found";
import { dhakaYear, formatTicketNo, parseTicketNo } from "@/server/domain/ticket";

const SAT_TO_THU = [6, 0, 1, 2, 3, 4];
const stops = [
  { name: "Dhanmondi 27", offsetMinutes: 0 },
  { name: "Kalabagan", offsetMinutes: 10 },
  { name: "Gabtoli", offsetMinutes: 35 },
  { name: "City University Campus", offsetMinutes: 75 },
];
const trips: TripLike[] = [
  { id: "t1", departureTime: "07:00", direction: "TO_CAMPUS", daysOfWeek: SAT_TO_THU, isActive: true },
  { id: "t2", departureTime: "08:30", direction: "TO_CAMPUS", daysOfWeek: SAT_TO_THU, isActive: true },
  { id: "t3", departureTime: "13:30", direction: "FROM_CAMPUS", daysOfWeek: SAT_TO_THU, isActive: true },
  { id: "t4", departureTime: "17:00", direction: "FROM_CAMPUS", daysOfWeek: SAT_TO_THU, isActive: true },
  { id: "t5", departureTime: "06:00", direction: "TO_CAMPUS", daysOfWeek: SAT_TO_THU, isActive: false },
];
/** Builds an instant from a Dhaka wall-clock time. */
const dhaka = (iso: string) => new Date(`${iso}+06:00`);

describe("bus schedule (Asia/Dhaka)", () => {
  it("reads the Dhaka clock regardless of server timezone", () => {
    const clock = dhakaClock(dhaka("2026-10-07T07:15:00")); // Wednesday
    expect(clock.dayOfWeek).toBe(3);
    expect(clock.minutes).toBe(7 * 60 + 15);
  });

  it("finds the next departures from the route origin", () => {
    const next = nextDepartures(trips, stops, dhaka("2026-10-07T07:15:00"));
    expect(next.map((d) => [d.tripId, d.time])).toEqual([["t2", "08:30"], ["t3", "13:30"], ["t4", "17:00"]]);
    expect(next[0].minutesUntil).toBe(75);
  });

  it("computes the time at a stop in each direction", () => {
    const gabtoli = findStop(stops, "gabtoli");
    const inbound = nextDepartures(trips, stops, dhaka("2026-10-07T06:00:00"), { stop: gabtoli, direction: "TO_CAMPUS" });
    expect(inbound[0]).toMatchObject({ tripId: "t1", time: "07:35", stop: "Gabtoli" });
    // FROM_CAMPUS leaves campus at 13:30 and reaches Gabtoli after 75 - 35 = 40 min.
    const outbound = nextDepartures(trips, stops, dhaka("2026-10-07T12:00:00"), { stop: gabtoli, direction: "FROM_CAMPUS" });
    expect(outbound[0]).toMatchObject({ tripId: "t3", time: "14:10" });
  });

  it("skips departed trips and inactive ones", () => {
    const next = nextDepartures(trips, stops, dhaka("2026-10-07T05:00:00"), { limit: 1 });
    expect(next[0].tripId).toBe("t1"); // t5 at 06:00 is inactive
  });

  it("rolls over Friday (no service) to Saturday", () => {
    const next = nextDepartures(trips, stops, dhaka("2026-10-08T18:00:00"), { limit: 1 }); // Thursday evening
    expect(next[0]).toMatchObject({ tripId: "t1", time: "07:00", dayOffset: 2 });
    expect(next[0].at.toISOString()).toBe("2026-10-10T01:00:00.000Z"); // Sat 07:00 Dhaka
  });

  it("lists today's trips, none on Friday", () => {
    expect(todaysTrips(trips, dhaka("2026-10-07T23:00:00")).map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(todaysTrips(trips, dhaka("2026-10-09T10:00:00"))).toEqual([]);
  });

  it("validates stop lists", () => {
    expect(busStopsSchema.safeParse(stops).success).toBe(true);
    expect(busStopsSchema.safeParse([{ name: "A", offsetMinutes: 5 }, { name: "B", offsetMinutes: 10 }]).success).toBe(false);
    expect(busStopsSchema.safeParse([{ name: "Aa", offsetMinutes: 0 }, { name: "Bb", offsetMinutes: 0 }]).success).toBe(false);
  });

  it("describes operating days campus-week first", () => {
    expect(describeDays(SAT_TO_THU)).toBe("Sat, Sun, Mon, Tue, Wed, Thu");
  });
});

describe("complaint tickets", () => {
  it("formats CU-YYYY-NNNNNN", () => {
    expect(formatTicketNo(2026, 123)).toBe("CU-2026-000123");
    expect(formatTicketNo(2026, 1_234_567)).toBe("CU-2026-1234567");
  });

  it("rejects invalid sequences", () => {
    expect(() => formatTicketNo(2026, 0)).toThrow(RangeError);
    expect(() => formatTicketNo(2026, 1.5)).toThrow(RangeError);
  });

  it("parses and validates ticket numbers", () => {
    expect(parseTicketNo("cu-2026-000123")).toEqual({ year: 2026, sequence: 123 });
    expect(parseTicketNo("CU-2026-123")).toBeNull();
    expect(parseTicketNo("CU-2026-000123; DROP")).toBeNull();
  });

  it("uses the Dhaka calendar year", () => {
    expect(dhakaYear(new Date("2026-12-31T18:30:00Z"))).toBe(2027); // 00:30 on 1 Jan in Dhaka
    expect(dhakaYear(new Date("2026-12-31T17:59:00Z"))).toBe(2026);
  });
});

describe("lost & found claim flow", () => {
  const item = { reporterId: "reporter", status: "OPEN" as const, contactVisible: true };

  it("blocks self-claims, closed items and duplicate claims", () => {
    expect(claimBlocker(item, "reporter", null)).toBe("OWN_ITEM");
    expect(claimBlocker({ ...item, status: "CLAIMED" }, "someone", null)).toBe("ITEM_NOT_OPEN");
    expect(claimBlocker(item, "someone", "PENDING")).toBe("ALREADY_CLAIMED");
    expect(claimBlocker(item, "someone", "REJECTED")).toBeNull();
    expect(claimBlocker(item, "someone", null)).toBeNull();
  });

  it("enforces the status machine for reporters vs moderators", () => {
    expect(canTransition("OPEN", "RESOLVED", "reporter")).toBe(true);
    expect(canTransition("OPEN", "CLAIMED", "reporter")).toBe(false); // only via approving a claim
    expect(canTransition("CLAIMED", "OPEN", "reporter")).toBe(true);
    expect(canTransition("RESOLVED", "OPEN", "reporter")).toBe(false);
    expect(canTransition("RESOLVED", "OPEN", "moderator")).toBe(true);
    expect(canTransition("OPEN", "REJECTED", "reporter")).toBe(false);
  });

  it("reveals contact details only to the reporter or the approved claimer", () => {
    expect(canSeeContact(item, null, "claimer")).toBe(false);
    expect(canSeeContact(item, "stranger", "claimer")).toBe(false);
    expect(canSeeContact(item, "claimer", "claimer")).toBe(true);
    expect(canSeeContact({ ...item, contactVisible: false }, "claimer", "claimer")).toBe(false);
    expect(canSeeContact(item, "reporter", null)).toBe(true);
  });

  it("scores likely matches by category, text and date proximity", () => {
    const strong = matchScore({ sameCategory: true, textSimilarity: 0.6, daysApart: 1 });
    const weak = matchScore({ sameCategory: false, textSimilarity: 0.1, daysApart: 40 });
    expect(strong).toBeGreaterThan(0.7);
    expect(weak).toBeLessThan(0.1);
  });
});
