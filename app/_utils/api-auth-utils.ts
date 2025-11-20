import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionCookieName } from "./session-utils";

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return true;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }

  const token = match[1];
  return token === apiKey;
}

export async function validateSessionRequest(
  request: NextRequest
): Promise<boolean> {
  const cookieName = getSessionCookieName();
  const sessionId = request.cookies.get(cookieName)?.value;

  if (!sessionId) {
    return false;
  }

  return await validateSession(sessionId);
}

export function isAuthRequired(): boolean {
  const hasPassword = !!process.env.AUTH_PASSWORD;
  const hasSSO = process.env.SSO_MODE === "oidc";
  const hasApiKey = !!process.env.API_KEY;

  return hasPassword || hasSSO || hasApiKey;
}

export async function requireAuth(
  request: NextRequest
): Promise<Response | null> {
  if (!isAuthRequired()) {
    return null;
  }

  const hasValidSession = await validateSessionRequest(request);
  if (hasValidSession) {
    return null;
  }

  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const hasValidApiKey = validateApiKey(request);
    if (hasValidApiKey) {
      return null;
    }
  }

  if (process.env.DEBUGGER) {
    console.log("[API Auth] Unauthorized request:", {
      path: request.nextUrl.pathname,
      hasSession: hasValidSession,
      apiKeyConfigured: !!process.env.API_KEY,
      hasAuthHeader: !!request.headers.get("authorization"),
    });
  }

  return NextResponse.json(
    {
      error: "Unauthorized",
      message:
        "Authentication required. Use session cookie or API key (Bearer token).",
    },
    { status: 401 }
  );
}

export function withAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authError = await requireAuth(request);
    if (authError) {
      return authError;
    }

    return handler(request, ...args);
  };
}
