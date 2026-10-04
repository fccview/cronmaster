"use server";

import { readdir, readFile, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import {
  getLogsBaseDir,
  listLogFiles,
  pruneLogDirectory,
  pruneLogDirectoryIfDue,
} from "@/app/_utils/log-files-utils";

export interface LogEntry {
  filename: string;
  timestamp: string;
  fullPath: string;
  size: number;
  dateCreated: Date;
  exitCode?: number;
  hasError?: boolean;
}

export interface JobLogError {
  hasError: boolean;
  lastFailedLog?: string;
  lastFailedTimestamp?: Date;
  exitCode?: number;
  latestExitCode?: number;
  hasHistoricalFailures?: boolean;
}

const getJobLogPath = async (jobId: string): Promise<string | null> => {
  const basePath = getLogsBaseDir();

  if (!existsSync(basePath)) {
    return null;
  }

  try {
    const allFolders = await readdir(basePath);

    const matchingFolder = allFolders.find(
      (folder) => folder === jobId || folder.endsWith(`_${jobId}`)
    );

    if (matchingFolder) {
      return path.join(basePath, matchingFolder);
    }

    return path.join(basePath, jobId);
  } catch (error) {
    console.error("Error finding log path:", error);
    return path.join(basePath, jobId);
  }
};

export const getJobLogs = async (
  jobId: string,
  skipCleanup: boolean = false,
  includeExitCodes: boolean = false
): Promise<LogEntry[]> => {
  try {
    const logDir = await getJobLogPath(jobId);

    if (!logDir || !existsSync(logDir)) {
      return [];
    }

    if (!skipCleanup) {
      await pruneLogDirectoryIfDue(logDir);
    }

    const logFiles = await listLogFiles(logDir);

    const entries: LogEntry[] = [];
    for (const { name: file, fullPath, size, date } of logFiles) {
      let exitCode: number | undefined;
      let hasError: boolean | undefined;

      if (includeExitCodes) {
        const exitCodeValue = await getExitCodeForLog(fullPath);
        if (exitCodeValue !== null) {
          exitCode = exitCodeValue;
          hasError = exitCode !== 0;
        }
      }

      entries.push({
        filename: file,
        timestamp: file.replace(".log", ""),
        fullPath,
        size,
        dateCreated: date,
        exitCode,
        hasError,
      });
    }

    return entries;
  } catch (error) {
    console.error(`Error reading logs for job ${jobId}:`, error);
    return [];
  }
};

export const getLogContent = async (
  jobId: string,
  filename: string
): Promise<string> => {
  try {
    const logDir = await getJobLogPath(jobId);
    if (!logDir) {
      return "Log directory not found";
    }

    const logPath = path.join(logDir, filename);

    const content = await readFile(logPath, "utf-8");
    return content;
  } catch (error) {
    console.error(`Error reading log file ${filename}:`, error);
    return "Error reading log file";
  }
};

export const deleteLogFile = async (
  jobId: string,
  filename: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const logDir = await getJobLogPath(jobId);
    if (!logDir) {
      return {
        success: false,
        message: "Log directory not found",
      };
    }

    const logPath = path.join(logDir, filename);

    await unlink(logPath);

    return {
      success: true,
      message: "Log file deleted successfully",
    };
  } catch (error: any) {
    console.error(`Error deleting log file ${filename}:`, error);
    return {
      success: false,
      message: error.message || "Error deleting log file",
    };
  }
};

export const deleteAllJobLogs = async (
  jobId: string
): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  try {
    const logs = await getJobLogs(jobId, true);

    let deletedCount = 0;
    for (const log of logs) {
      const result = await deleteLogFile(jobId, log.filename);
      if (result.success) {
        deletedCount++;
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedCount} log files`,
      deletedCount,
    };
  } catch (error: any) {
    console.error(`Error deleting all logs for job ${jobId}:`, error);
    return {
      success: false,
      message: error.message || "Error deleting log files",
      deletedCount: 0,
    };
  }
};

export const cleanupJobLogs = async (
  jobId: string
): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  try {
    const logDir = await getJobLogPath(jobId);
    const deletedCount =
      logDir && existsSync(logDir) ? await pruneLogDirectory(logDir) : 0;

    return {
      success: true,
      message: `Cleaned up ${deletedCount} log files`,
      deletedCount,
    };
  } catch (error: any) {
    console.error(`Error cleaning up logs for job ${jobId}:`, error);
    return {
      success: false,
      message: error.message || "Error cleaning up log files",
      deletedCount: 0,
    };
  }
};

export const getJobLogStats = async (
  jobId: string
): Promise<{ count: number; totalSize: number; totalSizeMB: number }> => {
  try {
    const logs = await getJobLogs(jobId, true);

    const totalSize = logs.reduce((sum, log) => sum + log.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    return {
      count: logs.length,
      totalSize,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
    };
  } catch (error) {
    console.error(`Error getting log stats for job ${jobId}:`, error);
    return {
      count: 0,
      totalSize: 0,
      totalSizeMB: 0,
    };
  }
};

const getExitCodeForLog = async (logPath: string): Promise<number | null> => {
  try {
    const content = await readFile(logPath, "utf-8");
    const exitCodeMatch = content.match(/Exit Code\s*:\s*(-?\d+)/i);
    if (exitCodeMatch) {
      return parseInt(exitCodeMatch[1]);
    }
    return null;
  } catch (error) {
    console.error(`Error getting exit code for ${logPath}:`, error);
    return null;
  }
};

export const getJobLogError = async (jobId: string): Promise<JobLogError> => {
  try {
    const logs = await getJobLogs(jobId);

    if (logs.length === 0) {
      return { hasError: false };
    }

    const latestLog = logs[0];
    const latestExitCode = await getExitCodeForLog(latestLog.fullPath);

    if (latestExitCode !== null && latestExitCode !== 0) {
      return {
        hasError: true,
        lastFailedLog: latestLog.filename,
        lastFailedTimestamp: latestLog.dateCreated,
        exitCode: latestExitCode,
        latestExitCode,
        hasHistoricalFailures: false,
      };
    }

    let hasHistoricalFailures = false;
    let lastFailedLog: string | undefined;
    let lastFailedTimestamp: Date | undefined;
    let failedExitCode: number | undefined;

    for (let i = 1; i < logs.length; i++) {
      const exitCode = await getExitCodeForLog(logs[i].fullPath);
      if (exitCode !== null && exitCode !== 0) {
        hasHistoricalFailures = true;
        lastFailedLog = logs[i].filename;
        lastFailedTimestamp = logs[i].dateCreated;
        failedExitCode = exitCode;
        break;
      }
    }

    return {
      hasError: false,
      latestExitCode: latestExitCode ?? undefined,
      hasHistoricalFailures,
      lastFailedLog,
      lastFailedTimestamp,
      exitCode: failedExitCode,
    };
  } catch (error) {
    console.error(`Error checking log errors for job ${jobId}:`, error);
    return { hasError: false };
  }
};

export const getAllJobLogErrors = async (
  jobIds: string[]
): Promise<Map<string, JobLogError>> => {
  const errorMap = new Map<string, JobLogError>();

  await Promise.all(
    jobIds.map(async (jobId) => {
      const error = await getJobLogError(jobId);
      errorMap.set(jobId, error);
    })
  );

  return errorMap;
};
