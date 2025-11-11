import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_utils/api-auth-utils";
import {
  fetchCronJobs,
  editCronJob,
  removeCronJob,
} from "@/app/_server/actions/cronjobs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const cronJobs = await fetchCronJobs();
    const cronJob = cronJobs.find((job) => job.id === params.id);

    if (!cronJob) {
      return NextResponse.json(
        { success: false, error: "Cron job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: cronJob });
  } catch (error: any) {
    console.error("[API] Error fetching cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cron job",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { schedule, command, comment, logsEnabled } = body;

    const formData = new FormData();
    formData.append("id", params.id);
    if (schedule) formData.append("schedule", schedule);
    if (command) formData.append("command", command);
    if (comment !== undefined) formData.append("comment", comment);
    if (logsEnabled !== undefined)
      formData.append("logsEnabled", logsEnabled ? "true" : "false");

    const result = await editCronJob(formData);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error("[API] Error updating cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update cron job",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const result = await removeCronJob(params.id);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error("[API] Error deleting cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete cron job",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
