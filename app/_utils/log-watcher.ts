import { watch } from "fs";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { sseBroadcaster } from "./sse-broadcaster";
import { getRunningJob } from "./running-jobs-utils";
import { isLogFileFromRun } from "./log-files-utils";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("logs:watcher");

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

    log.debug("Detected job completion in log", {
      jobFolder: jobFolderName,
      exitCode,
    });
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
    log.error("Error processing log file", error);
  }
};

export const startLogWatcher = () => {
  if (watcher) {
    return;
  }

  if (!existsSync(LOGS_DIR)) {
    log.debug("Logs directory missing, log watcher not started", {
      dir: LOGS_DIR,
    });
    return;
  }

  log.info("Log watcher started", { dir: LOGS_DIR });
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
    log.info("Log watcher stopped");
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
  const maxAttempts = 30;
  let attempts = 0;

  const checkInterval = setInterval(() => {
    attempts++;

    if (attempts > maxAttempts) {
      log.warn(`Timeout waiting for log file for ${runId}`);
      clearInterval(checkInterval);
      return;
    }

    try {
      if (!existsSync(logDir)) {
        return;
      }

      const matchingFile = readdirSync(logDir)
        .filter((f) => f.endsWith(".log"))
        .sort()
        .reverse()
        .find((f) => {
          try {
            return isLogFileFromRun(
              f,
              statSync(path.join(logDir, f)),
              jobStartTime
            );
          } catch {
            return false;
          }
        });

      if (matchingFile) {
        clearInterval(checkInterval);
        log.debug("Found log file for run", { runId, file: matchingFile });
        callback(matchingFile);
      }
    } catch (error) {
      log.error(`Error watching for log file ${runId}`, error);
    }
  }, 500);

  return checkInterval;
};
