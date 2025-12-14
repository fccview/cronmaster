import { NextRequest, NextResponse } from "next/server";
import { getRunningJob } from "@/app/_utils/running-jobs-utils";
import { readFile, open } from "fs/promises";
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
    const offsetStr = searchParams.get("offset");
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    const maxLinesStr = searchParams.get("maxLines");
    const maxLines = maxLinesStr
      ? Math.min(Math.max(parseInt(maxLinesStr, 10), 100), 5000)
      : 500;

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

    let latestLogFile: string | null = null;
    let latestStats: any = null;
    const jobStartTime = new Date(job.startTime);
    const TIME_TOLERANCE_MS = 5000;

    if (job.logFileName) {
      const cachedFilePath = path.join(logDir, job.logFileName);
      if (existsSync(cachedFilePath)) {
        try {
          const { stat } = await import("fs/promises");
          latestLogFile = cachedFilePath;
          latestStats = await stat(latestLogFile);
        } catch (error) {
          console.error(`Error reading cached log file ${job.logFileName}:`, error);
        }
      }
    }

    if (!latestLogFile) {
      for (const file of sortedFiles) {
        const filePath = path.join(logDir, file);
        try {
          const { stat } = await import("fs/promises");
          const stats = await stat(filePath);
          const fileCreateTime = stats.birthtime || stats.mtime;

          if (fileCreateTime.getTime() >= jobStartTime.getTime() - TIME_TOLERANCE_MS) {
            latestLogFile = filePath;
            latestStats = stats;
            break;
          }
        } catch (error) {
          console.error(`Error checking file ${file}:`, error);
        }
      }

      if (!latestLogFile && sortedFiles.length > 0) {
        try {
          const { stat } = await import("fs/promises");
          const fallbackPath = path.join(logDir, sortedFiles[0]);
          const fallbackStats = await stat(fallbackPath);
          const now = new Date();
          const fileAge = now.getTime() - (fallbackStats.birthtime || fallbackStats.mtime).getTime();

          if (fileAge <= TIME_TOLERANCE_MS) {
            latestLogFile = fallbackPath;
            latestStats = fallbackStats;
          }
        } catch (error) {
          console.error(`Error stat-ing fallback file:`, error);
        }
      }
    }

    if (!latestLogFile || !latestStats) {
      return NextResponse.json(
        {
          status: job.status,
          content: "",
          message: "No log file found for this run",
        },
        { status: 200 }
      );
    }

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

      if (bytesToRead < fileSize) {
        const fileHandle = await open(latestLogFile, "r");
        const buffer = Buffer.alloc(bytesToRead);
        await fileHandle.read(buffer, 0, bytesToRead, fileSize - bytesToRead);
        await fileHandle.close();

        const tailContent = buffer.toString("utf-8");
        const lines = tailContent.split("\n");

        if (lines[0] && lines[0].length > 0) {
          lines.shift();
        }

        if (lines.length > maxLines) {
          displayedLines = lines.slice(-maxLines);
          truncated = true;
        } else {
          displayedLines = lines;
          truncated = true;
        }
      } else {
        const fullContent = await readFile(latestLogFile, "utf-8");
        const allLines = fullContent.split("\n");
        totalLines = allLines.length;

        if (totalLines > maxLines) {
          displayedLines = allLines.slice(-maxLines);
          truncated = true;
        } else {
          displayedLines = allLines;
        }
      }

      if (truncated) {
        content = `[LOG TRUNCATED - Showing last ${maxLines} lines (${(fileSize / 1024 / 1024).toFixed(2)}MB total)]\n\n` + displayedLines.join("\n");
      } else {
        content = displayedLines.join("\n");
        totalLines = displayedLines.length;
      }
      newContent = content;
    } else {
      if (offset < fileSize) {
        const fileHandle = await open(latestLogFile, "r");
        const bytesToRead = fileSize - offset;
        const buffer = Buffer.alloc(bytesToRead);
        await fileHandle.read(buffer, 0, bytesToRead, offset);
        await fileHandle.close();

        newContent = buffer.toString("utf-8");
        const newLines = newContent.split("\n").filter(l => l.length > 0);
        if (newLines.length > 0) {
          content = newContent;
        }
      }
    }

    return NextResponse.json({
      status: job.status,
      content,
      newContent,
      fullContent: offset === 0 ? content : undefined,
      logFile: sortedFiles[0],
      isComplete: job.status !== "running",
      exitCode: job.exitCode,
      fileSize,
      offset,
      totalLines: offset === 0 && !truncated ? totalLines : undefined,
      displayedLines: displayedLines.length,
      truncated,
    });
  } catch (error: any) {
    console.error("Error streaming log:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stream log" },
      { status: 500 }
    );
  }
};
