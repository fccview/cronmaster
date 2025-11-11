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

const readUserCrontab = async (user: string): Promise<string> => {
  const docker = await isDocker();

  if (docker) {
    const userCrontabs = await readAllHostCrontabs();
    const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);
    return targetUserCrontab?.content || "";
  } else {
    const { stdout } = await execAsync(READ_CRONTAB(user));
    return stdout;
  }
};

const writeUserCrontab = async (
  user: string,
  content: string
): Promise<boolean> => {
  const docker = await isDocker();

  if (docker) {
    return await writeHostCrontabForUser(user, content);
  } else {
    try {
      await execAsync(WRITE_CRONTAB(content, user));
      return true;
    } catch (error) {
      console.error(`Error writing crontab for user ${user}:`, error);
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
        console.error(`Error reading crontab for user ${user}:`, error);
        results.push({ user, content: "" });
      }
    }

    return results;
  }
};

export const getCronJobs = async (includeLogErrors: boolean = true): Promise<CronJob[]> => {
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
      const jobIds = allJobs.map(job => job.id);
      const errorMap = await getAllJobLogErrors(jobIds);

      allJobs = allJobs.map(job => ({
        ...job,
        logError: errorMap.get(job.id),
      }));
    }

    return allJobs;
  } catch (error) {
    console.error("Error getting cron jobs:", error);
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
    if (user) {
      const cronContent = await readUserCrontab(user);

      const lines = cronContent.split("\n");
      const existingJobs = parseJobsFromLines(lines, user);
      const nextJobIndex = existingJobs.length;
      const jobId = `${user}-${nextJobIndex}`;

      let finalCommand = command;
      if (logsEnabled && !isCommandWrapped(command)) {
        const docker = await isDocker();
        finalCommand = await wrapCommandWithLogger(jobId, command, docker, comment);
      } else if (logsEnabled && isCommandWrapped(command)) {
        finalCommand = command;
      }

      const formattedComment = formatCommentWithMetadata(comment, logsEnabled);

      const newEntry = formattedComment
        ? `# ${formattedComment}\n${schedule} ${finalCommand}`
        : `${schedule} ${finalCommand}`;

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

      const currentUser = process.env.USER || "user";
      const lines = cronContent.split("\n");
      const existingJobs = parseJobsFromLines(lines, currentUser);
      const nextJobIndex = existingJobs.length;
      const jobId = `${currentUser}-${nextJobIndex}`;

      let finalCommand = command;
      if (logsEnabled && !isCommandWrapped(command)) {
        const docker = await isDocker();
        finalCommand = await wrapCommandWithLogger(jobId, command, docker, comment);
      } else if (logsEnabled && isCommandWrapped(command)) {
        finalCommand = command;
      }

      const formattedComment = formatCommentWithMetadata(comment, logsEnabled);

      const newEntry = formattedComment
        ? `# ${formattedComment}\n${schedule} ${finalCommand}`
        : `${schedule} ${finalCommand}`;

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
    console.error("Error adding cron job:", error);
    return false;
  }
};

export const deleteCronJob = async (id: string): Promise<boolean> => {
  try {
    const [user, jobIndexStr] = id.split("-");
    const jobIndex = parseInt(jobIndexStr);

    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const newCronEntries = deleteJobInLines(lines, jobIndex);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    console.error("Error deleting cron job:", error);
    return false;
  }
};

export const updateCronJob = async (
  id: string,
  schedule: string,
  command: string,
  comment: string = "",
  logsEnabled: boolean = false
): Promise<boolean> => {
  try {
    const [user, jobIndexStr] = id.split("-");
    const jobIndex = parseInt(jobIndexStr);

    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const existingJobs = parseJobsFromLines(lines, user);
    const currentJob = existingJobs[jobIndex];

    if (!currentJob) {
      console.error(`Job with index ${jobIndex} not found`);
      return false;
    }

    const isWrappd = isCommandWrapped(command);

    let finalCommand = command;

    if (logsEnabled && !isWrappd) {
      const docker = await isDocker();
      finalCommand = await wrapCommandWithLogger(id, command, docker, comment);
    }
    else if (!logsEnabled && isWrappd) {
      finalCommand = unwrapCommand(command);
    }
    else if (logsEnabled && isWrappd) {
      const unwrapped = unwrapCommand(command);
      const docker = await isDocker();
      finalCommand = await wrapCommandWithLogger(id, unwrapped, docker, comment);
    }
    else {
      finalCommand = command;
    }

    const newCronEntries = updateJobInLines(
      lines,
      jobIndex,
      schedule,
      finalCommand,
      comment,
      logsEnabled
    );
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    console.error("Error updating cron job:", error);
    return false;
  }
};

export const pauseCronJob = async (id: string): Promise<boolean> => {
  try {
    const [user, jobIndexStr] = id.split("-");
    const jobIndex = parseInt(jobIndexStr);

    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const newCronEntries = pauseJobInLines(lines, jobIndex);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    console.error("Error pausing cron job:", error);
    return false;
  }
};

export const resumeCronJob = async (id: string): Promise<boolean> => {
  try {
    const [user, jobIndexStr] = id.split("-");
    const jobIndex = parseInt(jobIndexStr);

    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const newCronEntries = resumeJobInLines(lines, jobIndex);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    console.error("Error resuming cron job:", error);
    return false;
  }
};

export const cleanupCrontab = async (): Promise<boolean> => {
  try {
    const userCrontabs = await getAllUsers();

    for (const { user, content } of userCrontabs) {
      if (!content.trim()) continue;

      const cleanedContent = await cleanCrontabContent(content);
      await writeUserCrontab(user, cleanedContent);
    }

    return true;
  } catch (error) {
    console.error("Error cleaning crontab:", error);
    return false;
  }
};
