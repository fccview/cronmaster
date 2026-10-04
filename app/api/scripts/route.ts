import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_utils/api-auth-utils";
import { fetchScripts } from "@/app/_server/actions/scripts";
import { createLogger } from "@/app/_utils/logger";
import { getErrorMessage } from "@/app/_utils/error-utils";

const log = createLogger("api:scripts");

export const dynamic = "force-dynamic";

/**
 * GET /api/scripts - List all scripts
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const scripts = await fetchScripts();
    return NextResponse.json({ success: true, data: scripts });
  } catch (error: unknown) {
    log.error("Error fetching scripts", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch scripts",
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
