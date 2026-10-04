import { existsSync, copyFileSync } from "fs";
import path from "path";
import { DATA_DIR } from "../_consts/file";
import { getHostDataPath } from "../_server/actions/global";
import { toShellArg } from "./wrapper-utils-client";
import { shellQuoteIfNeeded } from "./shell-utils";
import { isSafeJobId } from "./security-utils";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("wrapper");

export {
  unwrapCommand,
  isCommandWrapped,
  extractJobIdFromWrappedCommand,
} from "./wrapper-utils-client";

export const generateLogFolderName = (jobId: string): string => {
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
      log.info("Installed wrapper script into data directory", {
        path: dataScriptPath,
      });
    } catch (error) {
      log.error("Failed to copy wrapper script to data directory", error);
      return sourceScriptPath;
    }
  }

  return dataScriptPath;
};

export const wrapCommandWithLogger = async (
  jobId: string,
  command: string,
  isDocker: boolean
): Promise<string> => {
  if (!isSafeJobId(jobId)) {
    throw new Error("Invalid cron job id");
  }

  ensureWrapperScriptInData();

  const logFolderName = generateLogFolderName(jobId);

  const safeCmd = toShellArg(command);

  if (isDocker) {
    const hostDataPath = await getHostDataPath();
    if (hostDataPath) {
      const hostWrapperPath = path.join(hostDataPath, "cron-log-wrapper.sh");
      log.debug("Wrapping command with host logger", {
        jobId,
        wrapperPath: hostWrapperPath,
      });
      return `${shellQuoteIfNeeded(hostWrapperPath)} "${logFolderName}" ${safeCmd}`;
    }
    log.error("Cannot wrap command, host data path unknown", { jobId });
    throw new Error(
      "Cannot determine the host data path for logging. Set HOST_DATA_DIR to the host directory mounted at /app/data, or check the Docker socket and /app/data mount."
    );
  }

  const localWrapperPath = path.join(
    process.cwd(),
    DATA_DIR,
    "cron-log-wrapper.sh"
  );
  log.debug("Wrapping command with local logger", {
    jobId,
    wrapperPath: localWrapperPath,
  });
  return `${shellQuoteIfNeeded(localWrapperPath)} "${logFolderName}" ${safeCmd}`;
};
