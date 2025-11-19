import { existsSync, copyFileSync } from "fs";
import path from "path";
import { DATA_DIR } from "../_consts/file";
import { getHostDataPath } from "../_server/actions/global";

const sanitizeForFilesystem = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

export const generateLogFolderName = (
  jobId: string,
  comment?: string
): string => {
  return jobId;
};

export const ensureWrapperScriptInData = (): string => {
  const sourceScriptPath = path.join(
    process.cwd(),
    "app",
    "_scripts",
    "cron-log-wrapper.sh"
  );
  const dataScriptPath = path.join(
    process.cwd(),
    DATA_DIR,
    "cron-log-wrapper.sh"
  );

  if (!existsSync(dataScriptPath)) {
    try {
      copyFileSync(sourceScriptPath, dataScriptPath);
    } catch (error) {
      console.error("Failed to copy wrapper script to data directory:", error);
      return sourceScriptPath;
    }
  }

  return dataScriptPath;
};

export const wrapCommandWithLogger = async (
  jobId: string,
  command: string,
  isDocker: boolean,
  comment?: string
): Promise<string> => {
  ensureWrapperScriptInData();

  const logFolderName = generateLogFolderName(jobId, comment);

  if (isDocker) {
    const hostDataPath = await getHostDataPath();
    if (hostDataPath) {
      const hostWrapperPath = path.join(hostDataPath, "cron-log-wrapper.sh");
      return `${hostWrapperPath} "${logFolderName}" ${command}`;
    }
    console.warn("Could not determine host data path, using container path");
  }

  const localWrapperPath = path.join(
    process.cwd(),
    DATA_DIR,
    "cron-log-wrapper.sh"
  );
  return `${localWrapperPath} "${logFolderName}" ${command}`;
};

export const unwrapCommand = (command: string): string => {
  const wrapperPattern = /^(.+\/cron-log-wrapper\.sh)\s+"([^"]+)"\s+(.+)$/;

  const match = command.match(wrapperPattern);

  if (match && match[3]) {
    return match[3];
  }

  return command;
};

export const isCommandWrapped = (command: string): boolean => {
  const wrapperPattern = /\/cron-log-wrapper\.sh\s+"[^"]+"\s+/;
  return wrapperPattern.test(command);
};

export const extractJobIdFromWrappedCommand = (
  command: string
): string | null => {
  const wrapperPattern = /\/cron-log-wrapper\.sh\s+"([^"]+)"\s+/;

  const match = command.match(wrapperPattern);

  if (match && match[1]) {
    return match[1];
  }

  return null;
};

export const cleanupOldLogFiles = async (
  jobId: string,
  maxFiles: number = 10
): Promise<void> => {
  try {
    const { readdir, stat, unlink } = await import("fs/promises");
    const logFolderName = generateLogFolderName(jobId);
    const logDir = path.join(process.cwd(), "data", "logs", logFolderName);

    try {
      await stat(logDir);
    } catch {
      return;
    }

    const files = await readdir(logDir);
    const logFiles = files
      .filter((f) => f.endsWith(".log"))
      .map((f) => ({
        name: f,
        path: path.join(logDir, f),
        stats: null as any,
      }));

    for (const file of logFiles) {
      try {
        file.stats = await stat(file.path);
      } catch (error) {
        console.error(`Error stat-ing log file ${file.path}:`, error);
      }
    }

    const validFiles = logFiles
      .filter((f) => f.stats)
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    if (validFiles.length > maxFiles) {
      const filesToDelete = validFiles.slice(maxFiles);
      for (const file of filesToDelete) {
        try {
          await unlink(file.path);
          console.log(`Cleaned up old log file: ${file.path}`);
        } catch (error) {
          console.error(`Error deleting log file ${file.path}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error cleaning up log files for job ${jobId}:`, error);
  }
};
