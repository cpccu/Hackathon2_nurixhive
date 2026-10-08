import { type NextRequest, NextResponse } from "next/server";
import { isStaff } from "@/lib/auth/rbac";
import { SESSION_COOKIE, type SessionClaims, verifySession } from "@/lib/auth/session";

/**
 * Next.js 16 Proxy (formerly middleware). Deliberately light: it only verifies the
 * JWT signature/expiry and role claim for fast redirects. The authoritative check
 * (account active, tokenVersion current) runs in Route Handlers via requireAuth().
 */

const ADMIN_LOGIN_PATH = "/admin/login";
const USER_LOGIN_PATH = "/login";
const USER_AREA_PREFIXES = ["/dashboard", "/profile", "/settings", "/my", "/notifications"];

/** Paths that stay reachable in maintenance mode (staff sign-in, health probes, crons, the flag itself). */
const MAINTENANCE_ALLOWED = ["/admin", "/api/admin", "/api/auth", "/api/health", "/api/settings", "/api/cron", "/api/revalidate", "/maintenance"];
const MAINTENANCE_TTL_MS = 10_000;

let maintenanceCache: { value: boolean; expires: number } | null = null;

/**
 * Reads the maintenance flag through the cached public settings endpoint and keeps
 * it for a few seconds per instance, so a page view never costs a database round trip.
 * Fails open: if the flag cannot be read the site stays up.
 */
async function isMaintenanceOn(origin: string): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expires > now) return maintenanceCache.value;
  let value = false;
  try {
    const response = await fetch(`${origin}/api/settings/public`, { cache: "no-store", signal: AbortSignal.timeout(2_000) });
    const body = (await response.json()) as { data?: { maintenanceMode?: boolean } };
    value = body.data?.maintenanceMode === true;
  } catch {
    value = false;
  }
  maintenanceCache = { value, expires: now + MAINTENANCE_TTL_MS };
  return value;
}

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function jsonError(status: 401 | 403 | 503, code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function redirectToLogin(request: NextRequest, loginPath: string, hadInvalidCookie: boolean): NextResponse {
  const url = new URL(loginPath, request.url);
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(url);
  if (hadInvalidCookie) response.cookies.delete(SESSION_COOKIE);
  return response;
}

function handleAdminApi(claims: SessionClaims | null): NextResponse {
  if (!claims) return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  if (!isStaff(claims)) return jsonError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  return NextResponse.next();
}

function handleAdminPage(request: NextRequest, claims: SessionClaims | null, hadCookie: boolean): NextResponse {
  const { pathname } = request.nextUrl;
  if (pathname === ADMIN_LOGIN_PATH) {
    return claims && isStaff(claims) ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }
  if (!claims || !isStaff(claims)) return redirectToLogin(request, ADMIN_LOGIN_PATH, hadCookie && !claims);
  return NextResponse.next();
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token);

  const exempt = MAINTENANCE_ALLOWED.some((prefix) => startsWithSegment(pathname, prefix));
  if (!exempt && !(claims && isStaff(claims)) && (await isMaintenanceOn(request.nextUrl.origin))) {
    if (startsWithSegment(pathname, "/api")) return jsonError(503, "MAINTENANCE", "CampusOS is under maintenance. Please try again shortly.");
    return NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503, headers: { "retry-after": "300" } });
  }

  if (startsWithSegment(pathname, "/api/admin")) return handleAdminApi(claims);
  if (startsWithSegment(pathname, "/admin")) return handleAdminPage(request, claims, Boolean(token));
  if (USER_AREA_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix)) && !claims) {
    return redirectToLogin(request, USER_LOGIN_PATH, Boolean(token));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static assets: needed so maintenance mode can cover the whole site.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?|txt|json)$).*)"],
};
