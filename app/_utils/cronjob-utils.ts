import { exec } from "child_process";
import { promisify } from "util";
import {
  getAllTargetUsers,
  readAllHostCrontabs,
  writeHostCrontabForUser,
} from "@/app/_utils/crontab-utils";
import {
  parseJobsFromLines,
  updateJobInLines,
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
import {
  assertSafeUsername,
  isValidCronSchedule,
  toSingleLine,
} from "@/app/_utils/security-utils";
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
  assertSafeUsername(user);
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
  try {
    assertSafeUsername(user);
  } catch {
    log.warn("Refusing to write crontab for invalid user", { user });
    return false;
  }

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
  if (await isDocker()) {
    return await readAllHostCrontabs();
  }

  const users = await getAllTargetUsers();
  const results: { user: string; content: string }[] = [];

  for (const user of users) {
    try {
      results.push({ user, content: await readUserCrontab(user) });
    } catch (error) {
      log.error(`Error reading crontab for user ${user}`, error);
      results.push({ user, content: "" });
    }
  }

  return results;
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
    if (!isValidCronSchedule(schedule)) {
      throw new Error("Invalid cron schedule");
    }
    comment = toSingleLine(comment);
    const jobId = generateShortUUID();
    log.debug("Adding job to crontab", { jobId, user, logsEnabled });

    const cronContent = user
      ? await readUserCrontab(user)
      : await readCronFiles();

    const finalCommand = logsEnabled
      ? await wrapCommandWithLogger(jobId, unwrapCommand(command), await isDocker())
      : command;

    const formattedComment = formatCommentWithMetadata(
      comment,
      logsEnabled,
      jobId
    );

    const newEntry = `# ${formattedComment}\n${schedule} ${finalCommand}`;

    const newCron =
      cronContent.trim() === ""
        ? newEntry
        : await cleanCrontabContent(cronContent.trim() + "\n" + newEntry);

    return user
      ? await writeUserCrontab(user, newCron)
      : await writeCronFiles(newCron);
  } catch (error) {
    log.error("Error adding cron job", error);
    throw error;
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
    if (!isValidCronSchedule(schedule)) {
      throw new Error("Invalid cron schedule");
    }
    comment = toSingleLine(comment);
    const user = jobData.user;
    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");

    const jobIndex = findJobIndex(jobData, lines, user);

    if (jobIndex === -1) {
      log.warn("Job not found in crontab", { jobId: jobData.id, user });
      return false;
    }

    const baseCommand = isCommandWrapped(command)
      ? unwrapCommand(command)
      : command;
    const finalCommand = logsEnabled
      ? await wrapCommandWithLogger(jobData.id, baseCommand, await isDocker())
      : baseCommand;

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

export type JobLinesResult = "updated" | "not-found" | "write-failed";

export const modifyJobInCrontab = async (
  jobData: {
    id: string;
    schedule: string;
    command: string;
    comment?: string;
    user: string;
  },
  transform: (lines: string[], jobIndex: number) => string[]
): Promise<JobLinesResult> => {
  const cronContent = await readUserCrontab(jobData.user);
  const lines = cronContent.split("\n");
  const jobIndex = findJobIndex(jobData, lines, jobData.user);

  if (jobIndex === -1) {
    return "not-found";
  }

  const newCron = await cleanCrontabContent(
    transform(lines, jobIndex).join("\n")
  );

  return (await writeUserCrontab(jobData.user, newCron))
    ? "updated"
    : "write-failed";
};
