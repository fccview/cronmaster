import { exec } from "child_process";
import { promisify } from "util";
import {
  readAllHostCrontabs,
  writeHostCrontabForUser,
} from "@/app/_utils/crontab-utils";
import {
  parseJobsFromLines,
  deleteJobInLines,
  updateJobInLines,
  pauseJobInLines,
  resumeJobInLines,
  formatCommentWithMetadata,
} from "@/app/_utils/line-manipulation-utils";
import {
  cleanCrontabContent,
  readCronFiles,
  writeCronFiles,
} from "@/app/_utils/files-manipulation-utils";
import { isDocker } from "@/app/_server/actions/global";
import { READ_CRONTAB, WRITE_CRONTAB } from "@/app/_consts/commands";
import {
  wrapCommandWithLogger,
  unwrapCommand,
  isCommandWrapped,
} from "@/app/_utils/wrapper-utils";
import { generateShortUUID } from "@/app/_utils/uuid-utils";
import { commandFailure, createLogger } from "@/app/_utils/logger";

const log = createLogger("crontab");

const execAsync = promisify(exec);

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  comment?: string;
  user: string;
  paused?: boolean;
  logsEnabled?: boolean;
  logError?: {
    hasError: boolean;
    lastFailedLog?: string;
    lastFailedTimestamp?: Date;
    exitCode?: number;
    latestExitCode?: number;
    hasHistoricalFailures?: boolean;
  };
}

export const readUserCrontab = async (user: string): Promise<string> => {
  const docker = await isDocker();

  if (docker) {
    const userCrontabs = await readAllHostCrontabs();
    const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);
    log.debug("Read user crontab", {
      user,
      docker,
      bytes: targetUserCrontab?.content.length || 0,
    });
    return targetUserCrontab?.content || "";
  } else {
    const { stdout } = await execAsync(READ_CRONTAB(user));
    log.debug("Read user crontab", { user, docker, bytes: stdout.length });
    return stdout;
  }
};

export const writeUserCrontab = async (
  user: string,
  content: string
): Promise<boolean> => {
  const docker = await isDocker();

  if (docker) {
    log.debug("Writing user crontab", { user, docker, bytes: content.length });
    return await writeHostCrontabForUser(user, content);
  } else {
    try {
      await execAsync(WRITE_CRONTAB(content, user));
      log.debug("Wrote user crontab", { user, docker, bytes: content.length });
      return true;
    } catch (error) {
      log.error(`Error writing crontab for user ${user}`, commandFailure(error));
      return false;
    }
  }
};

const getAllUsers = async (): Promise<{ user: string; content: string }[]> => {
  const docker = await isDocker();

  if (docker) {
    return await readAllHostCrontabs();
  } else {
    const { getAllTargetUsers } = await import("@/app/_utils/crontab-utils");
    const users = await getAllTargetUsers();
    const results: { user: string; content: string }[] = [];

    for (const user of users) {
      try {
        const { stdout } = await execAsync(READ_CRONTAB(user));
        results.push({ user, content: stdout });
      } catch (error) {
        log.error(`Error reading crontab for user ${user}`, error);
        results.push({ user, content: "" });
      }
    }

    return results;
  }
};

export const getCronJobs = async (
  includeLogErrors: boolean = true
): Promise<CronJob[]> => {
  try {
    const userCrontabs = await getAllUsers();
    let allJobs: CronJob[] = [];

    for (const { user, content } of userCrontabs) {
      if (!content.trim()) continue;

      const lines = content.split("\n");
      const jobs = parseJobsFromLines(lines, user);

      allJobs.push(...jobs);
    }

    if (includeLogErrors) {
      const { getAllJobLogErrors } = await import("@/app/_server/actions/logs");
      const jobIds = allJobs.map((job) => job.id);
      const errorMap = await getAllJobLogErrors(jobIds);

      allJobs = allJobs.map((job) => ({
        ...job,
        logError: errorMap.get(job.id),
      }));
    }

    log.debug("Loaded cron jobs", {
      count: allJobs.length,
      users: userCrontabs.length,
    });
    return allJobs;
  } catch (error) {
    log.error("Error getting cron jobs", error);
    return [];
  }
};

export const addCronJob = async (
  schedule: string,
  command: string,
  comment: string = "",
  user?: string,
  logsEnabled: boolean = false
): Promise<boolean> => {
  try {
    const jobId = generateShortUUID();
    log.debug("Adding job to crontab", { jobId, user, logsEnabled });

    if (user) {
      const cronContent = await readUserCrontab(user);

      let finalCommand = command;
      if (logsEnabled) {
        const docker = await isDocker();
        finalCommand = await wrapCommandWithLogger(
          jobId,
          unwrapCommand(command),
          docker,
          comment
        );
      }

      const formattedComment = formatCommentWithMetadata(
        comment,
        logsEnabled,
        jobId
      );

      const newEntry = `# ${formattedComment}\n${schedule} ${finalCommand}`;

      let newCron;
      if (cronContent.trim() === "") {
        newCron = newEntry;
      } else {
        const existingContent = cronContent.trim();
        newCron = await cleanCrontabContent(existingContent + "\n" + newEntry);
      }

      return await writeUserCrontab(user, newCron);
    } else {
      const cronContent = await readCronFiles();

      let finalCommand = command;
      if (logsEnabled) {
        const docker = await isDocker();
        finalCommand = await wrapCommandWithLogger(
          jobId,
          unwrapCommand(command),
          docker,
          comment
        );
      }

      const formattedComment = formatCommentWithMetadata(
        comment,
        logsEnabled,
        jobId
      );

      const newEntry = `# ${formattedComment}\n${schedule} ${finalCommand}`;

      let newCron;
      if (cronContent.trim() === "") {
        newCron = newEntry;
      } else {
        const existingContent = cronContent.trim();
        newCron = await cleanCrontabContent(existingContent + "\n" + newEntry);
      }

      return await writeCronFiles(newCron);
    }
  } catch (error) {
    log.error("Error adding cron job", error);
    throw error;
  }
};

export const deleteCronJob = async (id: string): Promise<boolean> => {
  try {
    const allJobs = await getCronJobs(false);
    const targetJob = allJobs.find((j) => j.id === id);

    if (!targetJob) {
      log.warn("Job not found", { jobId: id });
      return false;
    }

    const user = targetJob.user;
    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const userJobs = parseJobsFromLines(lines, user);
    const jobIndex = userJobs.findIndex((j) => j.id === id);

    if (jobIndex === -1) {
      log.warn("Job not found in parsed jobs", { jobId: id });
      return false;
    }

    const newCronEntries = deleteJobInLines(lines, jobIndex);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    log.error("Error deleting cron job", error);
    return false;
  }
};

export const updateCronJob = async (
  jobData: {
    id: string;
    schedule: string;
    command: string;
    comment?: string;
    user: string;
  },
  schedule: string,
  command: string,
  comment: string = "",
  logsEnabled: boolean = false
): Promise<boolean> => {
  try {
    const user = jobData.user;
    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");

    const jobIndex = findJobIndex(jobData, lines, user);

    if (jobIndex === -1) {
      log.warn("Job not found in crontab", { jobId: jobData.id, user });
      return false;
    }

    const isWrapped = isCommandWrapped(command);

    let finalCommand = command;

    if (logsEnabled && !isWrapped) {
      const docker = await isDocker();
      finalCommand = await wrapCommandWithLogger(
        jobData.id,
        command,
        docker,
        comment
      );
    } else if (!logsEnabled && isWrapped) {
      finalCommand = unwrapCommand(command);
    } else if (logsEnabled && isWrapped) {
      const unwrapped = unwrapCommand(command);
      const docker = await isDocker();
      finalCommand = await wrapCommandWithLogger(
        jobData.id,
        unwrapped,
        docker,
        comment
      );
    } else {
      finalCommand = command;
    }

    const newCronEntries = updateJobInLines(
      lines,
      jobIndex,
      schedule,
      finalCommand,
      comment,
      logsEnabled,
      jobData.id
    );
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    log.error("Error updating cron job", error);
    throw error;
  }
};

export const pauseCronJob = async (id: string): Promise<boolean> => {
  try {
    const allJobs = await getCronJobs(false);
    const targetJob = allJobs.find((j) => j.id === id);

    if (!targetJob) {
      log.warn("Job not found", { jobId: id });
      return false;
    }

    const user = targetJob.user;
    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const userJobs = parseJobsFromLines(lines, user);
    const jobIndex = userJobs.findIndex((j) => j.id === id);

    if (jobIndex === -1) {
      log.warn("Job not found in parsed jobs", { jobId: id });
      return false;
    }

    const newCronEntries = pauseJobInLines(lines, jobIndex, id);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    log.error("Error pausing cron job", error);
    return false;
  }
};

export const resumeCronJob = async (id: string): Promise<boolean> => {
  try {
    const allJobs = await getCronJobs(false);
    const targetJob = allJobs.find((j) => j.id === id);

    if (!targetJob) {
      log.warn("Job not found", { jobId: id });
      return false;
    }

    const user = targetJob.user;
    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const userJobs = parseJobsFromLines(lines, user);
    const jobIndex = userJobs.findIndex((j) => j.id === id);

    if (jobIndex === -1) {
      log.warn("Job not found in parsed jobs", { jobId: id });
      return false;
    }

    const newCronEntries = resumeJobInLines(lines, jobIndex, id);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    log.error("Error resuming cron job", error);
    return false;
  }
};

export const cleanupCrontab = async (): Promise<boolean> => {
  try {
    const userCrontabs = await getAllUsers();

    for (const { user, content } of userCrontabs) {
      if (!content.trim()) continue;

      const cleanedContent = await cleanCrontabContent(content);
      log.debug("Cleaned crontab", { user });
      await writeUserCrontab(user, cleanedContent);
    }

    return true;
  } catch (error) {
    log.error("Error cleaning crontab", error);
    return false;
  }
};

export const findJobIndex = (
  jobData: {
    id: string;
    schedule: string;
    command: string;
    comment?: string;
    user: string;
    paused?: boolean;
  },
  lines: string[],
  user: string
): number => {
  const cronContentStr = lines.join("\n");
  const userJobs = parseJobsFromLines(lines, user);

  if (cronContentStr.includes(`id: ${jobData.id}`)) {
    return userJobs.findIndex((j) => j.id === jobData.id);
  }

  return userJobs.findIndex(
    (j) =>
      j.schedule === jobData.schedule &&
      j.command === jobData.command &&
      j.user === jobData.user &&
      (j.comment || "") === (jobData.comment || "")
  );
};
