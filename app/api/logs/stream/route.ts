import { NextRequest, NextResponse } from "next/server";
import { getRunningJob } from "@/app/_utils/running-jobs-utils";
import { open } from "fs/promises";
import { existsSync } from "fs";
import { requireAuth } from "@/app/_utils/api-auth-utils";
import { findRunLogFile, getJobLogDir } from "@/app/_utils/log-files-utils";
import { createLogger } from "@/app/_utils/logger";
import { getErrorMessage } from "@/app/_utils/error-utils";

const log = createLogger("logs:stream");

export const dynamic = "force-dynamic";

const MAX_STREAM_LINES = 50000;

const readRange = async (
  filePath: string,
  start: number,
  end: number
): Promise<string> => {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(end - start);
    const { bytesRead } = await handle.read(buffer, 0, end - start, start);
    return buffer.subarray(0, bytesRead).toString("utf-8");
  } finally {
    await handle.close();
  }
};

export const GET = async (request: NextRequest) => {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get("runId");
    const offsetStr = searchParams.get("offset");
    const offset = offsetStr ? Math.max(parseInt(offsetStr, 10) || 0, 0) : 0;

    const maxLinesStr = searchParams.get("maxLines");
    const maxLines = maxLinesStr
      ? Math.min(Math.max(parseInt(maxLinesStr, 10) || 0, 100), MAX_STREAM_LINES)
      : 500;

    if (!runId) {
      return NextResponse.json(
        { error: "runId parameter is required" },
        { status: 400 }
      );
    }

    const job = getRunningJob(runId);

    if (!job) {
      log.debug("Log stream requested for unknown run", { runId });
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

    const logDir = getJobLogDir(job.logFolderName);

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

    const runLog = await findRunLogFile(
      logDir,
      new Date(job.startTime),
      job.logFileName
    );

    if (!runLog) {
      return NextResponse.json(
        {
          status: job.status,
          content: "",
          message: "No log file found for this run",
        },
        { status: 200 }
      );
    }

    const latestLogFile = runLog.fullPath;
    const latestStats = runLog.stats;
    const fileSize = latestStats.size;

    let displayedLines: string[] = [];
    let truncated = false;
    let totalLines = 0;
    let content = "";
    let newContent = "";

    if (offset === 0) {
      const AVERAGE_LINE_LENGTH = 100;
      const ESTIMATED_BYTES = maxLines * AVERAGE_LINE_LENGTH * 2;
      const bytesToRead = Math.min(ESTIMATED_BYTES, fileSize);
      const partial = bytesToRead < fileSize;

      const lines = (
        await readRange(latestLogFile, fileSize - bytesToRead, fileSize)
      ).split("\n");

      if (partial && lines[0] && lines[0].length > 0) {
        lines.shift();
      }

      if (!partial) {
        totalLines = lines.length;
      }

      displayedLines = lines.length > maxLines ? lines.slice(-maxLines) : lines;
      truncated = partial || lines.length > maxLines;

      content = truncated
        ? `[LOG TRUNCATED - Showing last ${maxLines} lines (${(fileSize / 1024 / 1024).toFixed(2)}MB total)]\n\n` + displayedLines.join("\n")
        : displayedLines.join("\n");
      newContent = content;
    } else if (offset < fileSize) {
      newContent = await readRange(latestLogFile, offset, fileSize);
      if (newContent.split("\n").some((line) => line.length > 0)) {
        content = newContent;
      }
    }

    return NextResponse.json({
      status: job.status,
      content,
      newContent,
      fullContent: offset === 0 ? content : undefined,
      logFile: runLog.name,
      isComplete: job.status !== "running",
      exitCode: job.exitCode,
      fileSize,
      offset,
      totalLines: offset === 0 && !truncated ? totalLines : undefined,
      displayedLines: displayedLines.length,
      truncated,
    });
  } catch (error: unknown) {
    log.error("Error streaming log", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to stream log" },
      { status: 500 }
    );
  }
};
