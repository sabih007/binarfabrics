/* ==========================================================================
   Edge gate for the admin area.

   This is a fast redirect for signed-out visitors, not the security boundary:
   it only checks that the cookie carries a valid signature. Every admin route
   handler still calls requireAdmin() and re-verifies against the database.
   ========================================================================== */

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "binar_admin";

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("[middleware] AUTH_SECRET is not set — refusing admin access.");
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // The login page and its endpoint must stay reachable while signed out.
  const isLoginPage = pathname === "/admin/login";
  const isAuthEndpoint =
    pathname === "/api/admin/login" || pathname === "/api/admin/logout";
  if (isAuthEndpoint) return NextResponse.next();

  const signedIn = await hasValidSession(req);

  if (isLoginPage) {
    // Already signed in? Skip the form.
    return signedIn
      ? NextResponse.redirect(new URL("/admin", req.url))
      : NextResponse.next();
  }

  if (signedIn) return NextResponse.next();

  // API calls want a JSON 401, not an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: { message: "Please sign in.", code: "UNAUTHENTICATED" } },
      { status: 401 }
    );
  }

  const login = new URL("/admin/login", req.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
