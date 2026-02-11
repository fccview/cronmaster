import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_utils/api-auth-utils";
import { executeJob } from "@/app/_server/actions/cronjobs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const runInBackground = searchParams.get("runInBackground") !== "false";

    const result = await executeJob(params.id, runInBackground);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error("[API] Error executing cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute cron job",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
