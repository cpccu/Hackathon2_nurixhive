import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { requirePermission } from "@/server/middleware/auth";
import { getAdminStats } from "@/server/queries/platform.queries";

/** Dashboard totals + chart series (cached under the `stats` tag, hourly key). */
export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.AdminAccess);
  return ok(await getAdminStats(hourBucket()), { headers: { "cache-control": "private, no-store" } });
});
