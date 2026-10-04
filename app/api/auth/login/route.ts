import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
} from "@/app/_utils/session-utils";
import { safeCompare } from "@/app/_utils/security-utils";
import {
  clearFailedLogins,
  getClientKey,
  getLockoutRemainingMs,
  registerFailedLogin,
} from "@/app/_utils/login-rate-limit";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("auth");

export const POST = async (request: NextRequest) => {
  try {
    const { password } = await request.json();

    const authPassword = process.env.AUTH_PASSWORD;

    if (!authPassword) {
      log.warn("Password login attempted but AUTH_PASSWORD is not configured");
      return NextResponse.json(
        { success: false, message: "Authentication not configured" },
        { status: 400 }
      );
    }

    const clientKey = getClientKey(request.headers);
    const lockoutMs = getLockoutRemainingMs(clientKey);

    if (lockoutMs > 0) {
      log.warn("Login blocked by rate limit", { client: clientKey });
      return NextResponse.json(
        { success: false, message: "Too many failed attempts, try again later" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(lockoutMs / 1000)) },
        }
      );
    }

    if (!safeCompare(password, authPassword)) {
      registerFailedLogin(clientKey);
      log.warn("Login failed, invalid password", { client: clientKey });
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      );
    }

    clearFailedLogins(clientKey);
    const sessionId = await createSession("password");

    const response = NextResponse.json(
      { success: true, message: "Login successful" },
      { status: 200 }
    );

    const cookieName = getSessionCookieName();

    log.info("Login successful", { authType: "password" });
    log.debug("Setting session cookie", {
      credentialName: cookieName,
      nodeEnv: process.env.NODE_ENV,
      https: process.env.HTTPS,
    });
    response.cookies.set(cookieName, sessionId, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    log.error("Login error", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
