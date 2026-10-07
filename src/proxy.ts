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

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function jsonError(status: 401 | 403, code: string, message: string): NextResponse {
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

  if (startsWithSegment(pathname, "/api/admin")) return handleAdminApi(claims);
  if (startsWithSegment(pathname, "/admin")) return handleAdminPage(request, claims, Boolean(token));
  if (USER_AREA_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix)) && !claims) {
    return redirectToLogin(request, USER_LOGIN_PATH, Boolean(token));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/my/:path*",
    "/notifications/:path*",
  ],
};
