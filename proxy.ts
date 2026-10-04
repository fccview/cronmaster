import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildFrameAncestors } from "@/app/_utils/security-headers";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("proxy");

const withPageSecurityHeaders = (response: NextResponse): NextResponse => {
  const frameAncestors = buildFrameAncestors(process.env.FRAME_ANCESTORS);
  if (frameAncestors) {
    response.headers.set("Content-Security-Policy", frameAncestors);
  }
  return response;
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth/check-session") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/oidc/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return withPageSecurityHeaders(response);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const authPassword = process.env.AUTH_PASSWORD;
  const ssoMode = process.env.SSO_MODE;
  const authRequired = authPassword || ssoMode === "oidc";

  if (!authRequired) {
    return withPageSecurityHeaders(NextResponse.next());
  }

  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-cronmaster-session"
      : "cronmaster-session";
  const sessionId = request.cookies.get(cookieName)?.value;

  log.debug("Checking session", {
    pathname,
    credentialName: cookieName,
    nodeEnv: process.env.NODE_ENV,
    https: process.env.HTTPS,
    hasCredential: !!sessionId,
    jarSize: request.cookies.getAll().length,
  });

  const loginUrl = new URL("/login", request.url);

  if (!sessionId) {
    log.debug("No session cookie, redirecting to login", { pathname });
    return NextResponse.redirect(loginUrl);
  }

  try {
    const internalApiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.APP_URL ||
      request.nextUrl.origin;

    log.debug("URL resolution", {
      internalApiUrl: process.env.INTERNAL_API_URL || "(not set)",
      appUrl: process.env.APP_URL || "(not set)",
      origin: request.nextUrl.origin,
      using: internalApiUrl,
    });

    const sessionCheckUrl = new URL(`${internalApiUrl}/api/auth/check-session`);

    log.debug("Session check URL", { url: sessionCheckUrl.href });

    const sessionCheck = await fetch(sessionCheckUrl, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
      cache: "no-store",
    });

    log.debug("Session check response", {
      status: sessionCheck.status,
      statusText: sessionCheck.statusText,
      ok: sessionCheck.ok,
    });

    if (!sessionCheck.ok) {
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete(cookieName);

      log.info("Session rejected, redirecting to login", {
        pathname,
        status: sessionCheck.status,
      });

      return redirectResponse;
    }
  } catch (error) {
    log.error("Session check error", error);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return withPageSecurityHeaders(response);
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|app-icons).*)",
  ],
};
