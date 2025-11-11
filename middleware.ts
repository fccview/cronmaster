import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const middleware = async (request: NextRequest) => {
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
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const authPassword = process.env.AUTH_PASSWORD;
  const ssoMode = process.env.SSO_MODE;
  const authRequired = authPassword || ssoMode === "oidc";

  if (!authRequired) {
    return NextResponse.next();
  }

  const cookieName =
    process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
      ? "__Host-cronmaster-session"
      : "cronmaster-session";
  const sessionId = request.cookies.get(cookieName)?.value;

  if (process.env.DEBUGGER) {
    console.log("MIDDLEWARE - sessionId:", sessionId);
    console.log("MIDDLEWARE - cookies:", request.cookies.getAll());
  }

  const loginUrl = new URL("/login", request.url);

  if (!sessionId) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const internalApiUrl =
      process.env.INTERNAL_API_URL ||
      process.env.APP_URL ||
      request.nextUrl.origin;

    if (process.env.DEBUGGER) {
      console.log("MIDDLEWARE - URL Resolution:");
      console.log(
        "  INTERNAL_API_URL:",
        process.env.INTERNAL_API_URL || "(not set)"
      );
      console.log("  APP_URL:", process.env.APP_URL || "(not set)");
      console.log("  request.nextUrl.origin:", request.nextUrl.origin);
      console.log("  → Using:", internalApiUrl);
    }

    const sessionCheckUrl = new URL(`${internalApiUrl}/api/auth/check-session`);

    if (process.env.DEBUGGER) {
      console.log("MIDDLEWARE - Session Check URL:", sessionCheckUrl.href);
    }

    const sessionCheck = await fetch(sessionCheckUrl, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
      cache: "no-store",
    });

    if (process.env.DEBUGGER) {
      console.log("MIDDLEWARE - Session Check Response:");
      console.log("  status:", sessionCheck.status);
      console.log("  statusText:", sessionCheck.statusText);
      console.log("  ok:", sessionCheck.ok);
    }

    if (!sessionCheck.ok) {
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete(cookieName);

      if (process.env.DEBUGGER) {
        console.log("MIDDLEWARE - session is not ok");
      }

      return redirectResponse;
    }
  } catch (error) {
    console.error("Session check error:", error);
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sw.js|app-icons).*)",
  ],
};
