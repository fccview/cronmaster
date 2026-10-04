import { exec, spawn } from "child_process";
import path from "path";
import { promisify } from "util";
import { CronJob } from "./cronjob-utils";
import { getUserInfo, getUserShell } from "./crontab-utils";
import { NSENTER_RUN_JOB } from "../_consts/nsenter";
import { isSafeUsername, resolveExecutionShell } from "./shell-utils";
import { createLogger } from "./logger";
import {
  saveRunningJob,
  updateRunningJob,
  getRunningJob,
  removeRunningJob,
} from "./running-jobs-utils";
import { sseBroadcaster } from "./sse-broadcaster";
import { generateLogFolderName } from "./wrapper-utils";
import { watchForLogFile } from "./log-watcher";
import { getLogsBaseDir, pruneLogDirectory } from "./log-files-utils";

const execAsync = promisify(exec);

export const JOB_TIMEOUT_MS = 300000;

interface ExecFailure {
  message?: unknown;
  stdout?: unknown;
  stderr?: unknown;
  code?: unknown;
  signal?: unknown;
  killed?: unknown;
}

export const describeJobExecutionError = (
  failure: unknown
): { message: string; output: string } => {
  const error = (failure ?? undefined) as ExecFailure | undefined;
  const pick = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";
  const output =
    pick(error?.stderr) ||
    pick(error?.stdout) ||
    pick(error?.message) ||
    "Unknown error occurred";

  if (error?.killed && error?.signal) {
    return {
      message: `Job timed out after ${JOB_TIMEOUT_MS / 1000} seconds and was stopped`,
      output,
    };
  }

  if (error?.signal) {
    return { message: `Job was terminated by ${String(error.signal)}`, output };
  }

  if (typeof error?.code === "number") {
    return { message: `Job exited with code ${error.code}`, output };
  }

  return {
    message: pick(error?.message) || "Failed to execute cron job",
    output,
  };
};

const log = createLogger("job:exec");

export const buildJobExecutionCommand = async (
  job: CronJob,
  docker: boolean
): Promise<string> => {
  if (!docker) {
    return job.command;
  }

  if (!isSafeUsername(job.user)) {
    throw new Error(`Refusing to run job for invalid user "${job.user}"`);
  }

  const userInfo = await getUserInfo(job.user);
  const executionUser = userInfo ? userInfo.username : "root";
  const configuredShell = process.env.EXECUTION_SHELL?.trim();
  const userShell = configuredShell ? null : await getUserShell(executionUser);
  const shell = resolveExecutionShell(userShell, configuredShell);

  if (shell) {
    log.debug("Overriding login shell for job execution", {
      user: executionUser,
      loginShell: userShell,
      shell,
    });
  }

  return NSENTER_RUN_JOB(executionUser, job.command, shell);
};

export const runJobSynchronously = async (
  job: CronJob,
  docker: boolean
): Promise<{
  success: boolean;
  message: string;
  output?: string;
  mode: "sync";
}> => {
  const command = await buildJobExecutionCommand(job, docker);

  const startedAt = Date.now();
  log.info("Job started", {
    jobId: job.id,
    user: job.user,
    mode: "sync",
    docker,
  });
  log.debug("Job command", { jobId: job.id, command: job.command });

  const { stdout, stderr } = await execAsync(command, {
    timeout: JOB_TIMEOUT_MS,
    cwd: process.env.HOME || "/home",
  });

  log.info("Job finished", {
    jobId: job.id,
    mode: "sync",
    exitCode: 0,
    durationMs: Date.now() - startedAt,
  });

  const output = stdout || stderr || "Command executed successfully";

  return {
    success: true,
    message: "Cron job executed successfully",
    output: output.trim(),
    mode: "sync",
  };
};

export const runJobInBackground = async (
  job: CronJob,
  docker: boolean
): Promise<{
  success: boolean;
  message: string;
  runId: string;
  mode: "async";
}> => {
  const runId = `run-${job.id}-${Date.now()}`;
  const logFolderName = generateLogFolderName(job.id, job.comment);

  const shellCommand = await buildJobExecutionCommand(job, docker);

  const child = spawn("sh", ["-c", shellCommand], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  log.info("Job started", {
    jobId: job.id,
    runId,
    pid: child.pid,
    user: job.user,
    mode: "async",
    docker,
  });
  log.debug("Job command", { jobId: job.id, runId, command: job.command });

  const jobStartTime = new Date();

  saveRunningJob({
    id: runId,
    cronJobId: job.id,
    pid: child.pid!,
    startTime: jobStartTime.toISOString(),
    status: "running",
    logFolderName,
  });

  watchForLogFile(runId, logFolderName, jobStartTime, (logFileName) => {
    try {
      updateRunningJob(runId, { logFileName });
      log.debug(`Cached logFileName for ${runId}: ${logFileName}`);
    } catch (error) {
      log.error(`Failed to cache logFileName for ${runId}`, error);
    }
  });

  sseBroadcaster.broadcast({
    type: "job-started",
    timestamp: jobStartTime.toISOString(),
    data: {
      runId,
      cronJobId: job.id,
      hasLogging: true,
    },
  });

  monitorRunningJob(runId, child.pid!);

  return {
    success: true,
    message: "Job started in background",
    runId,
    mode: "async",
  };
};

const monitorRunningJob = (runId: string, pid: number): void => {
  const checkInterval = setInterval(async () => {
    try {
      const isRunning = await isProcessStillRunning(pid);

      if (!isRunning) {
        clearInterval(checkInterval);

        const exitCode = await getExitCodeFromLog(runId);

        updateRunningJob(runId, {
          status: exitCode === 0 ? "completed" : "failed",
          exitCode,
        });

        setTimeout(async () => {
          try {
            removeRunningJob(runId);
            if (runningJob?.logFolderName) {
              await pruneLogDirectory(
                path.join(getLogsBaseDir(), runningJob.logFolderName)
              );
            }
          } catch (error) {
            log.error(`Error cleaning up job ${runId}`, error);
          }
        }, 5000);

        const runningJob = getRunningJob(runId);

        log[exitCode === 0 ? "info" : "warn"]("Job finished", {
          jobId: runningJob?.cronJobId,
          runId,
          mode: "async",
          exitCode: exitCode ?? null,
          durationMs: runningJob
            ? Date.now() - new Date(runningJob.startTime).getTime()
            : undefined,
        });

        if (runningJob) {
          if (exitCode === 0) {
            sseBroadcaster.broadcast({
              type: "job-completed",
              timestamp: new Date().toISOString(),
              data: {
                runId,
                cronJobId: runningJob.cronJobId,
                exitCode,
              },
            });
          } else {
            sseBroadcaster.broadcast({
              type: "job-failed",
              timestamp: new Date().toISOString(),
              data: {
                runId,
                cronJobId: runningJob.cronJobId,
                exitCode: exitCode ?? -1,
              },
            });
          }
        }
      }
    } catch (error) {
      log.error(`Error checking job ${runId}`, error);
      clearInterval(checkInterval);
    }
  }, 2000);
};

const isProcessStillRunning = async (pid: number): Promise<boolean> => {
  try {
    await execAsync(`kill -0 ${pid} 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
};

const getExitCodeFromLog = async (
  runId: string
): Promise<number | undefined> => {
  try {
    const { readdir, readFile, access } = await import("fs/promises");
    const path = await import("path");

    const job = getRunningJob(runId);
    if (!job || !job.logFolderName) {
      return undefined;
    }

    const logDir = path.join(process.cwd(), "data", "logs", job.logFolderName);

    try {
      await access(logDir);
    } catch {
      return undefined;
    }

    const files = await readdir(logDir);

    const sortedFiles = files.sort().reverse();
    if (sortedFiles.length === 0) {
      return undefined;
    }

    const latestLog = await readFile(
      path.join(logDir, sortedFiles[0]),
      "utf-8"
    );

    const exitCodeMatch = latestLog.match(/Exit Code\s*:\s*(\d+)/);
    if (exitCodeMatch) {
      return parseInt(exitCodeMatch[1], 10);
    }

    return undefined;
  } catch (error) {
    log.error("Error reading exit code from log", error);
    return undefined;
  }
};
