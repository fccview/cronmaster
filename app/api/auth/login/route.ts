import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
} from "@/app/_utils/session-utils";
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

    if (password !== authPassword) {
      log.warn("Login failed, invalid password", {
        ip: request.headers.get("x-forwarded-for") || undefined,
      });
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      );
    }

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
