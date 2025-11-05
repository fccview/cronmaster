import { exec } from "child_process";
import { promisify } from "util";
import {
  readAllHostCrontabs,
  writeHostCrontabForUser,
} from "@/app/_utils/crontab-utils";
import { parseJobsFromLines, deleteJobInLines, updateJobInLines, pauseJobInLines, resumeJobInLines } from "@/app/_utils/line-manipulation-utils";
import { cleanCrontabContent, readCronFiles, writeCronFiles } from "@/app/_utils/files-manipulation-utils";
import { isDocker } from "@/app/_server/actions/global";
import { READ_CRONTAB, WRITE_CRONTAB } from "@/app/_consts/commands";

const execAsync = promisify(exec);

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  comment?: string;
  user: string;
  paused?: boolean;
}

const readUserCrontab = async (user: string): Promise<string> => {
  const docker = await isDocker();

  if (docker) {
    const userCrontabs = await readAllHostCrontabs();
    const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);
    return targetUserCrontab?.content || "";
  } else {
    const { stdout } = await execAsync(
      READ_CRONTAB(user)
    );
    return stdout;
  }
};

const writeUserCrontab = async (user: string, content: string): Promise<boolean> => {
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

export const getCronJobs = async (): Promise<CronJob[]> => {
  try {
    const userCrontabs = await getAllUsers();
    let allJobs: CronJob[] = [];

    for (const { user, content } of userCrontabs) {
      if (!content.trim()) continue;

      const lines = content.split("\n");
      const jobs = parseJobsFromLines(lines, user);
      allJobs.push(...jobs);
    }

    return allJobs;
  } catch (error) {
    console.error("Error getting cron jobs:", error);
    return [];
  }
}

export const addCronJob = async (
  schedule: string,
  command: string,
  comment: string = "",
  user?: string
): Promise<boolean> => {
  try {
    if (user) {
      const cronContent = await readUserCrontab(user);
      const newEntry = comment
        ? `# ${comment}\n${schedule} ${command}`
        : `${schedule} ${command}`;

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

      const newEntry = comment
        ? `# ${comment}\n${schedule} ${command}`
        : `${schedule} ${command}`;

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
}

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
}

export const updateCronJob = async (
  id: string,
  schedule: string,
  command: string,
  comment: string = ""
): Promise<boolean> => {
  try {
    const [user, jobIndexStr] = id.split("-");
    const jobIndex = parseInt(jobIndexStr);

    const cronContent = await readUserCrontab(user);
    const lines = cronContent.split("\n");
    const newCronEntries = updateJobInLines(lines, jobIndex, schedule, command, comment);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));

    return await writeUserCrontab(user, newCron);
  } catch (error) {
    console.error("Error updating cron job:", error);
    return false;
  }
}

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
}

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
}

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
}
