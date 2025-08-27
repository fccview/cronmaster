"use server";

import { exec } from "child_process";
import { promisify } from "util";
import { readHostCrontab, writeHostCrontab } from "../system/hostCrontab";

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

export const writeCronFiles = async (content: string): Promise<boolean> => {
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