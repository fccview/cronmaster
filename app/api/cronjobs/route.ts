import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_utils/api-auth-utils";
import { fetchCronJobs } from "@/app/_server/actions/cronjobs";

export const dynamic = "force-dynamic";

/**
 * GET /api/cronjobs - List all cron jobs
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const cronJobs = await fetchCronJobs();
    return NextResponse.json({ success: true, data: cronJobs });
  } catch (error: any) {
    console.error("[API] Error fetching cron jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cron jobs",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
