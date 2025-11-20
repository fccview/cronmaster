import { watch } from "fs";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { sseBroadcaster } from "./sse-broadcaster";
import { getRunningJob } from "./running-jobs-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const LOGS_DIR = path.join(DATA_DIR, "logs");

let watcher: ReturnType<typeof watch> | null = null;

const parseExitCodeFromLog = (content: string): number | null => {
  const match = content.match(/Exit Code\s*:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const processLogFile = (logFilePath: string) => {
  try {
    const pathParts = logFilePath.split(path.sep);
    const logsIndex = pathParts.indexOf("logs");

    if (logsIndex === -1 || logsIndex >= pathParts.length - 2) {
      return;
    }

    const jobFolderName = pathParts[logsIndex + 1];

    if (!existsSync(logFilePath)) {
      return;
    }

    const content = readFileSync(logFilePath, "utf-8");

    const exitCode = parseExitCodeFromLog(content);

    if (exitCode === null) {
      return;
    }

    const runningJob = getRunningJob(`run-${jobFolderName}`);

    if (exitCode === 0) {
      sseBroadcaster.broadcast({
        type: "job-completed",
        timestamp: new Date().toISOString(),
        data: {
          runId: runningJob?.id || `run-${jobFolderName}`,
          cronJobId: runningJob?.cronJobId || jobFolderName,
          exitCode,
        },
      });
    } else {
      sseBroadcaster.broadcast({
        type: "job-failed",
        timestamp: new Date().toISOString(),
        data: {
          runId: runningJob?.id || `run-${jobFolderName}`,
          cronJobId: runningJob?.cronJobId || jobFolderName,
          exitCode,
        },
      });
    }
  } catch (error) {
    console.error("[LogWatcher] Error processing log file:", error);
  }
};

export const startLogWatcher = () => {
  if (watcher) {
    return;
  }

  if (!existsSync(LOGS_DIR)) {
    return;
  }

  watcher = watch(LOGS_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".log")) {
      return;
    }

    const fullPath = path.join(LOGS_DIR, filename);

    if (eventType === "change") {
      setTimeout(() => {
        processLogFile(fullPath);
      }, 500);
    }
  });
};

export const stopLogWatcher = () => {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
};

export const watchForLogFile = (
  runId: string,
  logFolderName: string,
  jobStartTime: Date,
  callback: (logFileName: string) => void
): NodeJS.Timeout => {
  const logDir = path.join(LOGS_DIR, logFolderName);
  const startTime = jobStartTime.getTime();
  const maxAttempts = 30;
  let attempts = 0;

  const checkInterval = setInterval(() => {
    attempts++;

    if (attempts > maxAttempts) {
      console.warn(`[LogWatcher] Timeout waiting for log file for ${runId}`);
      clearInterval(checkInterval);
      return;
    }

    try {
      if (!existsSync(logDir)) {
        return;
      }

      const files = readdirSync(logDir);
      const logFiles = files
        .filter((f) => f.endsWith(".log"))
        .map((f) => {
          const filePath = path.join(logDir, f);
          try {
            const stats = statSync(filePath);
            return {
              name: f,
              birthtime: stats.birthtime || stats.mtime,
            };
          } catch {
            return null;
          }
        })
        .filter((f): f is { name: string; birthtime: Date } => f !== null);

      const matchingFile = logFiles.find((f) => {
        const fileTime = f.birthtime.getTime();
        return fileTime >= startTime - 5000 && fileTime <= startTime + 30000;
      });

      if (matchingFile) {
        clearInterval(checkInterval);
        callback(matchingFile.name);
      }
    } catch (error) {
      console.error(`[LogWatcher] Error watching for log file ${runId}:`, error);
    }
  }, 500);

  return checkInterval;
};
