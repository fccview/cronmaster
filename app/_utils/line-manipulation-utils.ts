import { CronJob } from "@/app/_utils/cronjob-utils";
import { generateShortUUID } from "@/app/_utils/uuid-utils";

export const pauseJobInLines = (
  lines: string[],
  targetJobIndex: number,
  uuid: string
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
          const commentText = trimmedLine.substring(1).trim();
          const { comment, logsEnabled } = parseCommentMetadata(commentText);
          const formattedComment = formatCommentWithMetadata(comment, logsEnabled, uuid);
          const nextLine = lines[i + 1].trim();
          const pausedEntry = `# PAUSED: ${formattedComment}\n# ${nextLine}`;
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
      const formattedComment = formatCommentWithMetadata("", false, uuid);
      const pausedEntry = `# PAUSED: ${formattedComment}\n# ${trimmedLine}`;
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
  targetJobIndex: number,
  uuid: string
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
        const commentText = trimmedLine.substring(9).trim();
        const { comment, logsEnabled } = parseCommentMetadata(commentText);
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith("# ")) {
          const cronLine = lines[i + 1].trim().substring(2);
          const formattedComment = formatCommentWithMetadata(comment, logsEnabled, uuid);
          const resumedEntry = formattedComment ? `# ${formattedComment}\n${cronLine}` : cronLine;
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

export const parseCommentMetadata = (
  commentText: string
): { comment: string; logsEnabled: boolean; uuid?: string } => {
  if (!commentText) {
    return { comment: "", logsEnabled: false };
  }

  const parts = commentText.split("|").map((p) => p.trim());
  let comment = "";
  let logsEnabled = false;
  let uuid: string | undefined;

  if (parts.length > 1) {
    comment = parts[0] || "";
    const metadata = parts.slice(1).join("|").trim();

    const logsMatch = metadata.match(/logsEnabled:\s*(true|false)/i);
    if (logsMatch) {
      logsEnabled = logsMatch[1].toLowerCase() === "true";
    }

    const uuidMatch = metadata.match(/id:\s*([a-z0-9]{4}-[a-z0-9]{4})/i);
    if (uuidMatch) {
      uuid = uuidMatch[1].toLowerCase();
    }
  } else {
    const logsMatch = commentText.match(/logsEnabled:\s*(true|false)/i);
    const uuidMatch = commentText.match(/id:\s*([a-z0-9]{4}-[a-z0-9]{4})/i);

    if (logsMatch || uuidMatch) {
      if (logsMatch) {
        logsEnabled = logsMatch[1].toLowerCase() === "true";
      }
      if (uuidMatch) {
        uuid = uuidMatch[1].toLowerCase();
      }
      comment = "";
    } else {
      comment = parts[0] || "";
    }
  }

  return { comment, logsEnabled, uuid };
};

export const formatCommentWithMetadata = (
  comment: string,
  logsEnabled: boolean,
  uuid: string
): string => {
  const trimmedComment = comment.trim();
  const metadataParts: string[] = [];

  if (logsEnabled) {
    metadataParts.push("logsEnabled: true");
  }

  metadataParts.push(`id: ${uuid}`);

  const metadata = metadataParts.join(" | ");

  if (trimmedComment) {
    return `${trimmedComment} | ${metadata}`;
  }

  return metadata;
};

export const parseJobsFromLines = (
  lines: string[],
  user: string
): CronJob[] => {
  const jobs: CronJob[] = [];
  let currentComment = "";
  let currentLogsEnabled = false;
  let currentUuid: string | undefined;
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
      const commentText = trimmedLine.substring(9).trim();
      const { comment, logsEnabled, uuid } = parseCommentMetadata(commentText);

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith("# ")) {
          const commentedCron = nextLine.substring(2);
          const parts = commentedCron.split(/\s+/);
          if (parts.length >= 6) {
            const schedule = parts.slice(0, 5).join(" ");
            const command = parts.slice(5).join(" ");

            const jobId = uuid || generateShortUUID();

            jobs.push({
              id: jobId,
              schedule,
              command,
              comment: comment || undefined,
              user,
              paused: true,
              logsEnabled,
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
        const commentText = trimmedLine.substring(1).trim();
        const { comment, logsEnabled, uuid } = parseCommentMetadata(commentText);
        currentComment = comment;
        currentLogsEnabled = logsEnabled;
        currentUuid = uuid;
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
      const jobId = currentUuid || generateShortUUID();

      jobs.push({
        id: jobId,
        schedule,
        command,
        comment: currentComment || undefined,
        user,
        paused: false,
        logsEnabled: currentLogsEnabled,
      });

      jobIndex++;
      currentComment = "";
      currentLogsEnabled = false;
      currentUuid = undefined;
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
  comment: string = "",
  logsEnabled: boolean = false,
  uuid: string
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
        const formattedComment = formatCommentWithMetadata(
          comment,
          logsEnabled,
          uuid
        );
        const newEntry = formattedComment
          ? `# PAUSED: ${formattedComment}\n# ${schedule} ${command}`
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
          const formattedComment = formatCommentWithMetadata(
            comment,
            logsEnabled,
            uuid
          );
          const newEntry = formattedComment
            ? `# ${formattedComment}\n${schedule} ${command}`
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
      const formattedComment = formatCommentWithMetadata(comment, logsEnabled, uuid);
      const newEntry = formattedComment
        ? `# ${formattedComment}\n${schedule} ${command}`
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
