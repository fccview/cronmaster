import { NextRequest, NextResponse } from "next/server";
import { getRunningJob } from "@/app/_utils/running-jobs-utils";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { requireAuth } from "@/app/_utils/api-auth-utils";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json(
        { error: "runId parameter is required" },
        { status: 400 }
      );
    }

    const job = getRunningJob(runId);

    if (!job) {
      return NextResponse.json(
        { error: "Running job not found" },
        { status: 404 }
      );
    }

    if (!job.logFolderName) {
      return NextResponse.json(
        { error: "Job does not have logging enabled" },
        { status: 400 }
      );
    }

    const logDir = path.join(process.cwd(), "data", "logs", job.logFolderName);

    if (!existsSync(logDir)) {
      return NextResponse.json(
        {
          status: job.status,
          content: "",
          message: "Log directory not yet created",
        },
        { status: 200 }
      );
    }

    const { readdirSync } = await import("fs");
    const files = readdirSync(logDir);

    if (files.length === 0) {
      return NextResponse.json(
        {
          status: job.status,
          content: "",
          message: "Log file not yet created",
        },
        { status: 200 }
      );
    }

    const sortedFiles = files.sort().reverse();
    const latestLogFile = path.join(logDir, sortedFiles[0]);

    const content = await readFile(latestLogFile, "utf-8");

    return NextResponse.json({
      status: job.status,
      content,
      logFile: sortedFiles[0],
      isComplete: job.status !== "running",
      exitCode: job.exitCode,
    });
  } catch (error: any) {
    console.error("Error streaming log:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stream log" },
      { status: 500 }
    );
  }
};
