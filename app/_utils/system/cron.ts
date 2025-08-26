import { exec } from "child_process";
import { promisify } from "util";
import {
  readHostCrontab,
  writeHostCrontab,
  readAllHostCrontabs,
  writeHostCrontabForUser,
} from "./hostCrontab";

const execAsync = promisify(exec);

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  comment?: string;
  user: string;
  paused?: boolean;
}

function pauseJobInLines(lines: string[], targetJobIndex: number): string[] {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (
      trimmedLine.startsWith("# User:") ||
      trimmedLine.startsWith("# System Crontab")
    ) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (trimmedLine.startsWith("# PAUSED: ")) {
      newCronEntries.push(line);
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
        newCronEntries.push(lines[i + 1]);
        i += 2;
      } else {
        i++;
      }
      currentJobIndex++;
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      if (
        i + 1 < lines.length &&
        !lines[i + 1].trim().startsWith("#") &&
        lines[i + 1].trim()
      ) {
        if (currentJobIndex === targetJobIndex) {
          const comment = trimmedLine.substring(1).trim();
          const nextLine = lines[i + 1].trim();
          const pausedEntry = `# PAUSED: ${comment}\n# ${nextLine}`;
          newCronEntries.push(pausedEntry);
          i += 2;
          currentJobIndex++;
        } else {
          newCronEntries.push(line);
          i++;
        }
      } else {
        newCronEntries.push(line);
        i++;
      }
      continue;
    }

    if (currentJobIndex === targetJobIndex) {
      const pausedEntry = `# PAUSED:\n# ${trimmedLine}`;
      newCronEntries.push(pausedEntry);
    } else {
      newCronEntries.push(line);
    }

    currentJobIndex++;
    i++;
  }

  return newCronEntries;
}

function resumeJobInLines(lines: string[], targetJobIndex: number): string[] {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (
      trimmedLine.startsWith("# User:") ||
      trimmedLine.startsWith("# System Crontab")
    ) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (trimmedLine.startsWith("# PAUSED: ")) {
      if (currentJobIndex === targetJobIndex) {
        const comment = trimmedLine.substring(10).trim();
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          const cronLine = lines[i + 1].trim().substring(2);
          const resumedEntry = comment ? `# ${comment}\n${cronLine}` : cronLine;
          newCronEntries.push(resumedEntry);
          i += 2;
        } else {
          i++;
        }
      } else {
        newCronEntries.push(line);
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          newCronEntries.push(lines[i + 1]);
          i += 2;
        } else {
          i++;
        }
      }
      currentJobIndex++;
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    newCronEntries.push(line);
    currentJobIndex++;
    i++;
  }

  return newCronEntries;
}

function parseJobsFromLines(lines: string[], user: string): CronJob[] {
  const jobs: CronJob[] = [];
  let currentComment = "";
  let jobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      i++;
      continue;
    }

    if (
      trimmedLine.startsWith("# User:") ||
      trimmedLine.startsWith("# System Crontab")
    ) {
      i++;
      continue;
    }

    if (trimmedLine.startsWith("# PAUSED: ")) {
      const comment = trimmedLine.substring(10).trim();

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith("# ")) {
          const commentedCron = nextLine.substring(2);
          const parts = commentedCron.split(/\s+/);
          if (parts.length >= 6) {
            const schedule = parts.slice(0, 5).join(" ");
            const command = parts.slice(5).join(" ");

            jobs.push({
              id: `${user}-${jobIndex}`,
              schedule,
              command,
              comment: comment || undefined,
              user,
              paused: true,
            });

            jobIndex++;
            i += 2;
            continue;
          }
        }
      }
      i++;
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      if (
        i + 1 < lines.length &&
        !lines[i + 1].trim().startsWith("#") &&
        lines[i + 1].trim()
      ) {
        currentComment = trimmedLine.substring(1).trim();
        i++;
        continue;
      } else {
        i++;
        continue;
      }
    }

    const parts = trimmedLine.split(/\s+/);
    if (parts.length >= 6) {
      const schedule = parts.slice(0, 5).join(" ");
      const command = parts.slice(5).join(" ");

      jobs.push({
        id: `${user}-${jobIndex}`,
        schedule,
        command,
        comment: currentComment || undefined,
        user,
        paused: false,
      });

      jobIndex++;
      currentComment = "";
    }
    i++;
  }

  return jobs;
}

function deleteJobInLines(lines: string[], targetJobIndex: number): string[] {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (
      trimmedLine.startsWith("# User:") ||
      trimmedLine.startsWith("# System Crontab")
    ) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (trimmedLine.startsWith("# PAUSED: ")) {
      if (currentJobIndex !== targetJobIndex) {
        newCronEntries.push(line);
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          newCronEntries.push(lines[i + 1]);
          i += 2;
        } else {
          i++;
        }
      } else {
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          i += 2;
        } else {
          i++;
        }
      }
      currentJobIndex++;
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      if (
        i + 1 < lines.length &&
        !lines[i + 1].trim().startsWith("#") &&
        lines[i + 1].trim()
      ) {
        if (currentJobIndex !== targetJobIndex) {
          newCronEntries.push(line);
        }
        i++;
      } else {
        newCronEntries.push(line);
        i++;
      }
      continue;
    }

    if (currentJobIndex !== targetJobIndex) {
      newCronEntries.push(line);
    }

    currentJobIndex++;
    i++;
  }

  return newCronEntries;
}

function updateJobInLines(
  lines: string[],
  targetJobIndex: number,
  schedule: string,
  command: string,
  comment: string = ""
): string[] {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (
      trimmedLine.startsWith("# User:") ||
      trimmedLine.startsWith("# System Crontab")
    ) {
      newCronEntries.push(line);
      i++;
      continue;
    }

    if (trimmedLine.startsWith("# PAUSED: ")) {
      if (currentJobIndex === targetJobIndex) {
        const newEntry = comment
          ? `# PAUSED: ${comment}\n# ${schedule} ${command}`
          : `# PAUSED:\n# ${schedule} ${command}`;
        newCronEntries.push(newEntry);
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          i += 2;
        } else {
          i++;
        }
      } else {
        newCronEntries.push(line);
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          newCronEntries.push(lines[i + 1]);
          i += 2;
        } else {
          i++;
        }
      }
      currentJobIndex++;
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      if (
        i + 1 < lines.length &&
        !lines[i + 1].trim().startsWith("#") &&
        lines[i + 1].trim()
      ) {
        if (currentJobIndex === targetJobIndex) {
          const newEntry = comment
            ? `# ${comment}\n${schedule} ${command}`
            : `${schedule} ${command}`;
          newCronEntries.push(newEntry);
          i += 2;
        } else {
          newCronEntries.push(line);
          i++;
        }
      } else {
        newCronEntries.push(line);
        i++;
      }
      continue;
    }

    if (currentJobIndex === targetJobIndex) {
      const newEntry = comment
        ? `# ${comment}\n${schedule} ${command}`
        : `${schedule} ${command}`;
      newCronEntries.push(newEntry);
    } else {
      newCronEntries.push(line);
    }

    currentJobIndex++;
    i++;
  }

  return newCronEntries;
}

async function readCronFiles(): Promise<string> {
  const isDocker = process.env.DOCKER === "true";

  if (!isDocker) {
    try {
      const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
      return stdout;
    } catch (error) {
      console.error("Error reading crontab:", error);
      return "";
    }
  }

  return await readHostCrontab();
}

async function writeCronFiles(content: string): Promise<boolean> {
  const isDocker = process.env.DOCKER === "true";

  if (!isDocker) {
    try {
      await execAsync('echo "' + content + '" | crontab -');
      return true;
    } catch (error) {
      console.error("Error writing crontab:", error);
      return false;
    }
  }

  return await writeHostCrontab(content);
}

export async function getCronJobs(): Promise<CronJob[]> {
  try {
    const isDocker = process.env.DOCKER === "true";
    let allJobs: CronJob[] = [];

    if (isDocker) {
      const userCrontabs = await readAllHostCrontabs();

      for (const { user, content } of userCrontabs) {
        if (!content.trim()) continue;

        const lines = content.split("\n");
        const jobs = parseJobsFromLines(lines, user);
        allJobs.push(...jobs);
      }
    } else {
      const { getAllTargetUsers } = await import("./hostCrontab");
      const users = await getAllTargetUsers();

      for (const user of users) {
        try {
          const { stdout } = await execAsync(
            `crontab -l -u ${user} 2>/dev/null || echo ""`
          );
          const cronContent = stdout;

          if (!cronContent.trim()) continue;

          const lines = cronContent.split("\n");
          const jobs = parseJobsFromLines(lines, user);
          allJobs.push(...jobs);
        } catch (error) {
          console.error(`Error reading crontab for user ${user}:`, error);
        }
      }
    }

    return allJobs;
  } catch (error) {
    console.error("Error getting cron jobs:", error);
    return [];
  }
}

export async function addCronJob(
  schedule: string,
  command: string,
  comment: string = "",
  user?: string
): Promise<boolean> {
  try {
    const isDocker = process.env.DOCKER === "true";

    if (isDocker && user) {
      const userCrontabs = await readAllHostCrontabs();
      const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);

      if (!targetUserCrontab) {
        console.error(`User ${user} not found in available users`);
        return false;
      }

      const newEntry = comment
        ? `# ${comment}\n${schedule} ${command}`
        : `${schedule} ${command}`;

      let newCron;
      if (targetUserCrontab.content.trim() === "") {
        newCron = newEntry;
      } else {
        const existingContent = targetUserCrontab.content.endsWith("\n")
          ? targetUserCrontab.content
          : targetUserCrontab.content + "\n";
        newCron = existingContent + newEntry;
      }

      return await writeHostCrontabForUser(user, newCron);
    } else if (user) {
      try {
        const { stdout } = await execAsync(
          `crontab -l -u ${user} 2>/dev/null || echo ""`
        );
        const cronContent = stdout;

        const newEntry = comment
          ? `# ${comment}\n${schedule} ${command}`
          : `${schedule} ${command}`;

        let newCron;
        if (cronContent.trim() === "") {
          newCron = newEntry;
        } else {
          const existingContent = cronContent.endsWith("\n")
            ? cronContent
            : cronContent + "\n";
          newCron = existingContent + newEntry;
        }

        await execAsync(`echo '${newCron}' | crontab -u ${user} -`);
        return true;
      } catch (error) {
        console.error(`Error adding cron job for user ${user}:`, error);
        return false;
      }
    } else {
      const cronContent = await readCronFiles();

      const newEntry = comment
        ? `# ${comment}\n${schedule} ${command}`
        : `${schedule} ${command}`;

      let newCron;
      if (cronContent.trim() === "") {
        newCron = newEntry;
      } else {
        const existingContent = cronContent.endsWith("\n")
          ? cronContent
          : cronContent + "\n";
        newCron = existingContent + newEntry;
      }

      return await writeCronFiles(newCron);
    }
  } catch (error) {
    console.error("Error adding cron job:", error);
    return false;
  }
}

export async function deleteCronJob(id: string): Promise<boolean> {
  try {
    const isDocker = process.env.DOCKER === "true";

    if (isDocker && id.includes("-")) {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      const userCrontabs = await readAllHostCrontabs();
      const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);

      if (!targetUserCrontab) {
        console.error(`User ${user} not found`);
        return false;
      }

      const lines = targetUserCrontab.content.split("\n");
      const newCronEntries = deleteJobInLines(lines, jobIndex);
      const newCron = newCronEntries.join("\n") + "\n";

      return await writeHostCrontabForUser(user, newCron);
    } else {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      try {
        const { stdout } = await execAsync(
          `crontab -l -u ${user} 2>/dev/null || echo ""`
        );
        const cronContent = stdout;
        const lines = cronContent.split("\n");
        const newCronEntries = deleteJobInLines(lines, jobIndex);
        const newCron = newCronEntries.join("\n") + "\n";

        await execAsync(`echo '${newCron}' | crontab -u ${user} -`);
        return true;
      } catch (error) {
        console.error(`Error deleting cron job for user ${user}:`, error);
        return false;
      }
    }
  } catch (error) {
    console.error("Error deleting cron job:", error);
  }

  return false;
}

export async function updateCronJob(
  id: string,
  schedule: string,
  command: string,
  comment: string = ""
): Promise<boolean> {
  try {
    const isDocker = process.env.DOCKER === "true";

    if (isDocker && id.includes("-")) {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      const userCrontabs = await readAllHostCrontabs();
      const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);

      if (!targetUserCrontab) {
        console.error(`User ${user} not found`);
        return false;
      }

      const lines = targetUserCrontab.content.split("\n");
      const newCronEntries = updateJobInLines(
        lines,
        jobIndex,
        schedule,
        command,
        comment
      );
      const newCron = newCronEntries.join("\n") + "\n";

      return await writeHostCrontabForUser(user, newCron);
    } else {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      try {
        const { stdout } = await execAsync(
          `crontab -l -u ${user} 2>/dev/null || echo ""`
        );
        const cronContent = stdout;
        const lines = cronContent.split("\n");
        const newCronEntries = updateJobInLines(
          lines,
          jobIndex,
          schedule,
          command,
          comment
        );
        const newCron = newCronEntries.join("\n") + "\n";

        await execAsync(`echo '${newCron}' | crontab -u ${user} -`);
        return true;
      } catch (error) {
        console.error(`Error updating cron job for user ${user}:`, error);
        return false;
      }
    }
  } catch (error) {
    console.error("Error updating cron job:", error);
  }

  return false;
}

export async function pauseCronJob(id: string): Promise<boolean> {
  try {
    const isDocker = process.env.DOCKER === "true";

    if (isDocker && id.includes("-")) {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      const userCrontabs = await readAllHostCrontabs();
      const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);

      if (!targetUserCrontab) {
        console.error(`User ${user} not found`);
        return false;
      }

      const lines = targetUserCrontab.content.split("\n");
      const newCronEntries = pauseJobInLines(lines, jobIndex);
      const newCron = newCronEntries.join("\n") + "\n";

      return await writeHostCrontabForUser(user, newCron);
    } else {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      try {
        const { stdout } = await execAsync(
          `crontab -l -u ${user} 2>/dev/null || echo ""`
        );
        const cronContent = stdout;
        const lines = cronContent.split("\n");
        const newCronEntries = pauseJobInLines(lines, jobIndex);
        const newCron = newCronEntries.join("\n") + "\n";

        await execAsync(`echo '${newCron}' | crontab -u ${user} -`);
        return true;
      } catch (error) {
        console.error(`Error pausing cron job for user ${user}:`, error);
        return false;
      }
    }
  } catch (error) {
    console.error("Error pausing cron job:", error);
  }

  return false;
}

export async function resumeCronJob(id: string): Promise<boolean> {
  try {
    const isDocker = process.env.DOCKER === "true";

    if (isDocker && id.includes("-")) {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      const userCrontabs = await readAllHostCrontabs();
      const targetUserCrontab = userCrontabs.find((uc) => uc.user === user);

      if (!targetUserCrontab) {
        console.error(`User ${user} not found`);
        return false;
      }

      const lines = targetUserCrontab.content.split("\n");
      const newCronEntries = resumeJobInLines(lines, jobIndex);
      const newCron = newCronEntries.join("\n") + "\n";

      return await writeHostCrontabForUser(user, newCron);
    } else {
      const [user, jobIndexStr] = id.split("-");
      const jobIndex = parseInt(jobIndexStr);

      try {
        const { stdout } = await execAsync(
          `crontab -l -u ${user} 2>/dev/null || echo ""`
        );
        const cronContent = stdout;
        const lines = cronContent.split("\n");
        const newCronEntries = resumeJobInLines(lines, jobIndex);
        const newCron = newCronEntries.join("\n") + "\n";

        await execAsync(`echo '${newCron}' | crontab -u ${user} -`);
        return true;
      } catch (error) {
        console.error(`Error resuming cron job for user ${user}:`, error);
        return false;
      }
    }
  } catch (error) {
    console.error("Error resuming cron job:", error);
  }

  return false;
}
