"use server";

import { readdir, readFile, unlink, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { DATA_DIR } from "@/app/_consts/file";

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

const MAX_LOGS_PER_JOB = process.env.MAX_LOGS_PER_JOB
  ? parseInt(process.env.MAX_LOGS_PER_JOB)
  : 50;
const MAX_LOG_AGE_DAYS = process.env.MAX_LOG_AGE_DAYS
  ? parseInt(process.env.MAX_LOG_AGE_DAYS)
  : 30;

const getLogBasePath = async (): Promise<string> => {
  return path.join(process.cwd(), DATA_DIR, "logs");
};

const getJobLogPath = async (jobId: string): Promise<string | null> => {
  const basePath = await getLogBasePath();

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
      await cleanupJobLogs(jobId);
    }

    const files = await readdir(logDir);
    const logFiles = files.filter((f) => f.endsWith(".log"));

    const entries: LogEntry[] = [];
    for (const file of logFiles) {
      const fullPath = path.join(logDir, file);
      const stats = await stat(fullPath);

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
        size: stats.size,
        dateCreated: stats.birthtime,
        exitCode,
        hasError,
      });
    }

    return entries.sort(
      (a, b) => b.dateCreated.getTime() - a.dateCreated.getTime()
    );
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
    const logs = await getJobLogs(jobId);

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
    const logs = await getJobLogs(jobId, true);

    if (logs.length === 0) {
      return {
        success: true,
        message: "No logs to clean up",
        deletedCount: 0,
      };
    }

    let deletedCount = 0;
    const now = new Date();
    const maxAgeMs = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (const log of logs) {
      const ageMs = now.getTime() - log.dateCreated.getTime();
      if (ageMs > maxAgeMs) {
        const result = await deleteLogFile(jobId, log.filename);
        if (result.success) {
          deletedCount++;
        }
      }
    }

    const remainingLogs = await getJobLogs(jobId, true);
    if (remainingLogs.length > MAX_LOGS_PER_JOB) {
      const logsToDelete = remainingLogs.slice(MAX_LOGS_PER_JOB);
      for (const log of logsToDelete) {
        const result = await deleteLogFile(jobId, log.filename);
        if (result.success) {
          deletedCount++;
        }
      }
    }

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
    const logs = await getJobLogs(jobId);

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
