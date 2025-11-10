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
  if (comment && comment.trim()) {
    const sanitized = sanitizeForFilesystem(comment.trim());
    return sanitized ? `${sanitized}_${jobId}` : jobId;
  }
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
      console.log(`Copied wrapper script to ${dataScriptPath}`);
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
