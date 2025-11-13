"use server";

import { exec } from "child_process";
import { promisify } from "util";
import { readHostCrontab, writeHostCrontab } from "@/app/_utils/crontab-utils";
import { isDocker } from "@/app/_server/actions/global";
import { READ_CRON_FILE, WRITE_CRON_FILE } from "@/app/_consts/commands";

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
            return stdout;
        } catch (error) {
            console.error("Error reading crontab:", error);
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
            return true;
        } catch (error) {
            console.error("Error writing crontab:", error);
            return false;
        }
    }

    return await writeHostCrontab(content);
}