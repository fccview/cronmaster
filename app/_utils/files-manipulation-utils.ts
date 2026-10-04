import { exec } from "child_process";
import { promisify } from "util";
import { readHostCrontab, writeHostCrontab } from "@/app/_utils/crontab-utils";
import { isDocker } from "@/app/_server/actions/global";
import { READ_CRON_FILE, WRITE_CRON_FILE } from "@/app/_consts/commands";
import { commandFailure, createLogger } from "@/app/_utils/logger";

const log = createLogger("crontab");

const execAsync = promisify(exec);

export const cleanCrontabContent = async (content: string): Promise<string> => {
    const lines = content.split("\n");
    const cleanedLines: string[] = [];
    let consecutiveEmptyLines = 0;

    for (const line of lines) {
        if (line.trim() === "") {
            consecutiveEmptyLines++;
            if (consecutiveEmptyLines <= 1) {
                cleanedLines.push("");
            }
        } else {
            consecutiveEmptyLines = 0;
            cleanedLines.push(line);
        }
    }

    return cleanedLines.join("\n").trim();
}

export const readCronFiles = async (): Promise<string> => {
    const docker = await isDocker();

    if (!docker) {
        try {
            const { stdout } = await execAsync(READ_CRON_FILE());
            log.debug("Read crontab file", { bytes: stdout.length });
            return stdout;
        } catch (error) {
            log.error("Error reading crontab", error);
            return "";
        }
    }

    return await readHostCrontab();
}

export const writeCronFiles = async (content: string): Promise<boolean> => {
    const docker = await isDocker();

    if (!docker) {
        try {
            await execAsync(WRITE_CRON_FILE(content));
            log.debug("Wrote crontab file", { bytes: content.length });
            return true;
        } catch (error) {
            log.error("Error writing crontab", commandFailure(error));
            return false;
        }
    }

    return await writeHostCrontab(content);
}