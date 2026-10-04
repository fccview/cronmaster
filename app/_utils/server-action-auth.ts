import { cookies, headers } from "next/headers";
import { validateSession, getSessionCookieName } from "./session-utils";
import { safeCompare } from "./security-utils";
import { createLogger } from "./logger";

const log = createLogger("auth");

export const isUiAuthEnabled = (): boolean =>
  !!process.env.AUTH_PASSWORD || process.env.SSO_MODE === "oidc";

export const API_KEY_ONLY_WARNING =
  "API_KEY is set without AUTH_PASSWORD or SSO_MODE: you chose to protect the /api/* REST routes only, the web UI and its server actions are open to anyone who can reach this instance";

export const isApiKeyOnlyAuth = (): boolean =>
  !!process.env.API_KEY && !isUiAuthEnabled();

const hasValidBearer = (authHeader: string | null): boolean => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || !authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return !!match && safeCompare(match[1], apiKey);
};

export const isActionAuthorized = async (): Promise<boolean> => {
  if (!isUiAuthEnabled()) return true;

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (sessionId && (await validateSession(sessionId))) return true;

  const headerStore = await headers();
  return hasValidBearer(headerStore.get("authorization"));
};

export const requireActionAuth = async (): Promise<void> => {
  let authorized = false;

  try {
    authorized = await isActionAuthorized();
  } catch (error) {
    log.warn("Server action auth check failed", { error });
  }

  if (!authorized) {
    log.warn("Rejected unauthenticated server action call");
    throw new Error("Unauthorized");
  }
};
