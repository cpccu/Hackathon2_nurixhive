import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, ValidationError, withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { findStop, nextDepartures } from "@/server/domain/bus-schedule";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getBusRoute } from "@/server/queries/campus.queries";
import { nextBusQuerySchema } from "@/server/validators/campus.validators";

/** Next departures for a route (optionally at a stop / in a direction), Asia/Dhaka aware. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "bus-next");
  const query = parseQuery(request, nextBusQuerySchema);
  const route = await getBusRoute(query.route);
  if (!route) throw new NotFoundError("Bus route not found.");

  const stop = query.stop ? findStop(route.stops, query.stop) : null;
  if (query.stop && !stop) {
    throw new ValidationError(undefined, [{ path: "stop", message: `Unknown stop. Stops: ${route.stops.map((s) => s.name).join(", ")}` }]);
  }
  const now = new Date();
  return ok({
    route: { code: route.code, name: route.name },
    stop: stop?.name ?? null,
    now,
    departures: nextDepartures(route.trips, route.stops, now, { stop, direction: query.direction, limit: query.limit }),
  });
});
