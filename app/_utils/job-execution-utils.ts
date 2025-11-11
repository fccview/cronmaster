import { exec, spawn } from "child_process";
import { promisify } from "util";
import { CronJob } from "./cronjob-utils";
import { getUserInfo } from "./crontab-utils";
import { NSENTER_RUN_JOB } from "../_consts/nsenter";
import {
  saveRunningJob,
  updateRunningJob,
  getRunningJob,
} from "./running-jobs-utils";
import { sseBroadcaster } from "./sse-broadcaster";
import { generateLogFolderName } from "./wrapper-utils";

const execAsync = promisify(exec);

export const runJobSynchronously = async (
  job: CronJob,
  docker: boolean
): Promise<{
  success: boolean;
  message: string;
  output?: string;
  mode: "sync";
}> => {
  let command: string;

  if (docker) {
    const userInfo = await getUserInfo(job.user);
    const executionUser = userInfo ? userInfo.username : "root";
    const escapedCommand = job.command.replace(/'/g, "'\\''");
    command = NSENTER_RUN_JOB(executionUser, escapedCommand);
  } else {
    command = job.command;
  }

  const { stdout, stderr } = await execAsync(command, {
    timeout: 300000,
    cwd: process.env.HOME || "/home",
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

  let command: string;
  let shellArgs: string[];

  if (docker) {
    const userInfo = await getUserInfo(job.user);
    const executionUser = userInfo ? userInfo.username : "root";
    const escapedCommand = job.command.replace(/'/g, "'\\''");
    const nsenterCmd = NSENTER_RUN_JOB(executionUser, escapedCommand);

    command = "sh";
    shellArgs = ["-c", nsenterCmd];
  } else {
    command = "sh";
    shellArgs = ["-c", job.command];
  }

  const child = spawn(command, shellArgs, {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  saveRunningJob({
    id: runId,
    cronJobId: job.id,
    pid: child.pid!,
    startTime: new Date().toISOString(),
    status: "running",
    logFolderName,
  });

  sseBroadcaster.broadcast({
    type: "job-started",
    timestamp: new Date().toISOString(),
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

/**
 * Monitor a running job and update status when complete
 */
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

        const runningJob = getRunningJob(runId);

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
      console.error(`[Monitor] Error checking job ${runId}:`, error);
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
    const { readdir, readFile } = await import("fs/promises");
    const path = await import("path");

    const job = getRunningJob(runId);
    if (!job || !job.logFolderName) {
      return undefined;
    }

    const logDir = path.join(process.cwd(), "data", "logs", job.logFolderName);
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
    console.error("Error reading exit code from log:", error);
    return undefined;
  }
};
