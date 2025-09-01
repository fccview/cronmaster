import { CronJob } from "../system";

export const pauseJobInLines = (
  lines: string[],
  targetJobIndex: number
): string[] => {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (
        newCronEntries.length > 0 &&
        newCronEntries[newCronEntries.length - 1] !== ""
      ) {
        newCronEntries.push("");
      }
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

    if (trimmedLine.startsWith("# PAUSED:")) {
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
          newCronEntries.push(lines[i + 1]);
          i += 2;
          currentJobIndex++;
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
};

export const resumeJobInLines = (
  lines: string[],
  targetJobIndex: number
): string[] => {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (
        newCronEntries.length > 0 &&
        newCronEntries[newCronEntries.length - 1] !== ""
      ) {
        newCronEntries.push("");
      }
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

    if (trimmedLine.startsWith("# PAUSED:")) {
      if (currentJobIndex === targetJobIndex) {
        const comment = trimmedLine.substring(9).trim();
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
};

export const parseJobsFromLines = (
  lines: string[],
  user: string
): CronJob[] => {
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

    if (trimmedLine.startsWith("# PAUSED:")) {
      const comment = trimmedLine.substring(9).trim();

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

    let schedule, command;
    const parts = trimmedLine.split(/(?:\s|\t)+/);

    if (parts[0].startsWith("@")) {
      if (parts.length >= 2) {
        schedule = parts[0];
        command = trimmedLine.slice(trimmedLine.indexOf(parts[1]));
      }
    } else if (parts.length >= 6) {
      schedule = parts.slice(0, 5).join(" ");
      command = trimmedLine.slice(trimmedLine.indexOf(parts[5]));
    }

    if (schedule && command) {
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
};

export const deleteJobInLines = (
  lines: string[],
  targetJobIndex: number
): string[] => {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (
        newCronEntries.length > 0 &&
        newCronEntries[newCronEntries.length - 1] !== ""
      ) {
        newCronEntries.push("");
      }
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

    if (trimmedLine.startsWith("# PAUSED:")) {
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
          newCronEntries.push(lines[i + 1]);
        }
        i += 2;
        currentJobIndex++;
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
};

export const updateJobInLines = (
  lines: string[],
  targetJobIndex: number,
  schedule: string,
  command: string,
  comment: string = ""
): string[] => {
  const newCronEntries: string[] = [];
  let currentJobIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (
        newCronEntries.length > 0 &&
        newCronEntries[newCronEntries.length - 1] !== ""
      ) {
        newCronEntries.push("");
      }
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

    if (trimmedLine.startsWith("# PAUSED:")) {
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
          newCronEntries.push(lines[i + 1]);
          i += 2;
        }
        currentJobIndex++;
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
};
