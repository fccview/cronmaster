import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSessionCookieName,
} from "@/app/_utils/session-utils";

export const POST = async (request: NextRequest) => {
  try {
    const { password } = await request.json();

    const authPassword = process.env.AUTH_PASSWORD;

    if (!authPassword) {
      return NextResponse.json(
        { success: false, message: "Authentication not configured" },
        { status: 400 }
      );
    }

    if (password !== authPassword) {
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

    if (process.env.DEBUGGER) {
      console.log("LOGIN - cookieName:", cookieName);
      console.log("LOGIN - NODE_ENV:", process.env.NODE_ENV);
      console.log("LOGIN - HTTPS:", process.env.HTTPS);
      console.log("LOGIN - sessionId:", sessionId.substring(0, 10) + "...");
    }
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
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
};
