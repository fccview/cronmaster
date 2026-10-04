import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { DATA_DIR } from "../_consts/file";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("job:running");

export interface RunningJob {
  id: string;
  cronJobId: string;
  pid: number;
  startTime: string;
  status: "running" | "completed" | "failed";
  exitCode?: number;
  logFolderName?: string;
  logFileName?: string;
  lastReadPosition?: number;
}

const RUNNING_JOBS_FILE = path.join(process.cwd(), DATA_DIR, "running-jobs.json");

export const getAllRunningJobs = (): RunningJob[] => {
  try {
    if (!existsSync(RUNNING_JOBS_FILE)) {
      return [];
    }
    const data = readFileSync(RUNNING_JOBS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    log.error("Error reading running jobs", error);
    return [];
  }
};

export const getRunningJob = (runId: string): RunningJob | null => {
  const jobs = getAllRunningJobs();
  return jobs.find((job) => job.id === runId) || null;
};

export const saveRunningJob = (job: RunningJob): void => {
  try {
    const jobs = getAllRunningJobs();
    jobs.push(job);
    log.debug("Tracking running job", {
      runId: job.id,
      jobId: job.cronJobId,
      pid: job.pid,
    });
    writeFileSync(RUNNING_JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
  } catch (error) {
    log.error("Error saving running job", error);
    throw error;
  }
};

export const updateRunningJob = (runId: string, updates: Partial<RunningJob>): void => {
  try {
    const jobs = getAllRunningJobs();
    const index = jobs.findIndex((job) => job.id === runId);

    if (index === -1) {
      throw new Error(`Running job ${runId} not found`);
    }

    jobs[index] = { ...jobs[index], ...updates };
    writeFileSync(RUNNING_JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
  } catch (error) {
    log.error("Error updating running job", error);
    throw error;
  }
};

export const removeRunningJob = (runId: string): void => {
  try {
    const jobs = getAllRunningJobs();
    const filtered = jobs.filter((job) => job.id !== runId);
    log.debug("Removed running job", { runId });
    writeFileSync(RUNNING_JOBS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  } catch (error) {
    log.error("Error removing running job", error);
    throw error;
  }
};
