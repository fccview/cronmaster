import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  getSessionCookieName,
  getSession,
} from "@/app/_utils/session-utils";

export const POST = async (request: NextRequest) => {
  try {
    const cookieName = getSessionCookieName();
    const sessionId = request.cookies.get(cookieName)?.value;

    let authType: "password" | "oidc" | null = null;
    if (sessionId) {
      const session = await getSession(sessionId);
      authType = session?.authType || null;

      await deleteSession(sessionId);
    }

    if (authType === "oidc") {
      const appUrl = process.env.APP_URL || request.nextUrl.origin;
      const response = NextResponse.json(
        {
          success: true,
          message: "Redirecting to SSO logout",
          redirectTo: "/api/oidc/logout",
        },
        { status: 200 }
      );

      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    const response = NextResponse.json(
      { success: true, message: "Logout successful" },
      { status: 200 }
    );

    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
