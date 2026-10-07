import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { nextDepartures } from "@/server/domain/bus-schedule";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getBusRoute } from "@/server/queries/campus.queries";
import { busRouteCodeSchema } from "@/server/validators/campus.validators";

const paramsSchema = z.object({ code: busRouteCodeSchema });

/** Route with stops and trips, plus the next 3 departures computed live (Asia/Dhaka). */
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/bus/routes/[code]">) => {
  await rateLimitPublicRead(request, "bus-route");
  const { code } = parseParams(await context.params, paramsSchema);
  const route = await getBusRoute(code);
  if (!route) throw new NotFoundError("Bus route not found.");
  return ok({ ...route, nextDepartures: nextDepartures(route.trips, route.stops, new Date(), { limit: 3 }) });
});
