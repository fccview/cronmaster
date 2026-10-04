import { existsSync, watch } from "fs";
import path from "path";
import { sseBroadcaster } from "./sse-broadcaster";
import { getAllRunningJobs } from "./running-jobs-utils";
import {
  findRunLogFile,
  getJobLogDir,
  getLogsBaseDir,
  readLogExitCode,
} from "./log-files-utils";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("logs:watcher");

const SETTLE_DELAY_MS = 500;

let watcher: ReturnType<typeof watch> | null = null;
const pendingFiles = new Map<string, NodeJS.Timeout>();

const processLogFile = async (logFilePath: string) => {
  try {
    const [jobFolderName, ...rest] = path
      .relative(getLogsBaseDir(), logFilePath)
      .split(path.sep);

    if (!jobFolderName || rest.length === 0 || jobFolderName === "..") {
      return;
    }

    if (!existsSync(logFilePath)) {
      return;
    }

    const exitCode = await readLogExitCode(logFilePath);

    if (exitCode === null) {
      return;
    }

    log.debug("Detected job completion in log", {
      jobFolder: jobFolderName,
      exitCode,
    });
    const runningJob = getAllRunningJobs().find(
      (job) => job.logFolderName === jobFolderName && job.status === "running"
    );

    sseBroadcaster.broadcast({
      type: exitCode === 0 ? "job-completed" : "job-failed",
      timestamp: new Date().toISOString(),
      data: {
        runId: runningJob?.id || `run-${jobFolderName}`,
        cronJobId: runningJob?.cronJobId || jobFolderName,
        exitCode,
      },
    });
  } catch (error) {
    log.error("Error processing log file", error);
  }
};

const scheduleLogFile = (fullPath: string) => {
  const pending = pendingFiles.get(fullPath);
  if (pending) {
    clearTimeout(pending);
  }

  pendingFiles.set(
    fullPath,
    setTimeout(() => {
      pendingFiles.delete(fullPath);
      processLogFile(fullPath);
    }, SETTLE_DELAY_MS)
  );
};

export const startLogWatcher = () => {
  if (watcher) {
    return;
  }

  const logsDir = getLogsBaseDir();

  if (!existsSync(logsDir)) {
    log.debug("Logs directory missing, log watcher not started", {
      dir: logsDir,
    });
    return;
  }

  log.info("Log watcher started", { dir: logsDir });
  watcher = watch(logsDir, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".log")) {
      return;
    }

    if (eventType === "change") {
      scheduleLogFile(path.join(logsDir, filename));
    }
  });
};

export const watchForLogFile = (
  runId: string,
  logFolderName: string,
  jobStartTime: Date,
  callback: (logFileName: string) => void
): NodeJS.Timeout => {
  const logDir = getJobLogDir(logFolderName);
  const maxAttempts = 30;
  let attempts = 0;
  let checking = false;

  const checkInterval = setInterval(async () => {
    if (checking) {
      return;
    }

    attempts++;

    if (attempts > maxAttempts) {
      log.warn(`Timeout waiting for log file for ${runId}`);
      clearInterval(checkInterval);
      return;
    }

    checking = true;
    try {
      const match = await findRunLogFile(logDir, jobStartTime);

      if (match) {
        clearInterval(checkInterval);
        log.debug("Found log file for run", { runId, file: match.name });
        callback(match.name);
      }
    } catch (error) {
      log.error(`Error watching for log file ${runId}`, error);
    } finally {
      checking = false;
    }
  }, 500);

  return checkInterval;
};
