import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionCookieName } from "@/app/_utils/session-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieName = getSessionCookieName();
  const sessionId = request.cookies.get(cookieName)?.value;

  if (!sessionId) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const isValid = await validateSession(sessionId);

  if (isValid) {
    return NextResponse.json({ valid: true }, { status: 200 });
  } else {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
