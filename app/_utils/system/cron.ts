import { exec } from "child_process";
import { promisify } from "util";
import { readHostCrontab, writeHostCrontab } from "./hostCrontab";

const execAsync = promisify(exec);

export interface CronJob {
    id: string;
    schedule: string;
    command: string;
    comment?: string;
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

    // Use the new host crontab utility for Docker
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

    // Use the new host crontab utility for Docker
    return await writeHostCrontab(content);
}

export async function getCronJobs(): Promise<CronJob[]> {
    try {
        const cronContent = await readCronFiles();

        if (!cronContent.trim()) {
            return [];
        }

        const lines = cronContent.split("\n");
        const jobs: CronJob[] = [];
        let currentComment = "";
        let currentUser = "";
        let jobIndex = 0;

        lines.forEach((line) => {
            const trimmedLine = line.trim();

            if (!trimmedLine) return;

            if (trimmedLine.startsWith("# User: ")) {
                currentUser = trimmedLine.substring(8).trim();
                return;
            }

            if (trimmedLine.startsWith("# System Crontab")) {
                currentUser = "system";
                return;
            }

            if (trimmedLine.startsWith("#")) {
                currentComment = trimmedLine.substring(1).trim();
                return;
            }

            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 6) {
                const schedule = parts.slice(0, 5).join(" ");
                const command = parts.slice(5).join(" ");

                jobs.push({
                    id: `unix-${jobIndex}`,
                    schedule,
                    command,
                    comment: currentComment,
                });

                currentComment = "";
                jobIndex++;
            }
        });

        return jobs;
    } catch (error) {
        console.error("Error getting cron jobs:", error);
        return [];
    }
}

export async function addCronJob(
    schedule: string,
    command: string,
    comment: string = ""
): Promise<boolean> {
    try {
        const cronContent = await readCronFiles();

        const newEntry = comment
            ? `# ${comment}\n${schedule} ${command}`
            : `${schedule} ${command}`;

        // Handle empty crontab vs existing content properly
        let newCron;
        if (cronContent.trim() === "") {
            newCron = newEntry;
        } else {
            // Ensure existing content ends with newline before adding new entry
            const existingContent = cronContent.endsWith('\n') ? cronContent : cronContent + '\n';
            newCron = existingContent + newEntry;
        }

        return await writeCronFiles(newCron);
    } catch (error) {
        console.error("Error adding cron job:", error);
        return false;
    }
}

export async function deleteCronJob(id: string): Promise<boolean> {
    try {
        const cronContent = await readCronFiles();
        const lines = cronContent.split("\n");
        let currentComment = "";
        let cronEntries: string[] = [];
        let jobIndex = 0;
        let targetJobIndex = parseInt(id.replace("unix-", ""));

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("# User:") || trimmedLine.startsWith("# System Crontab")) {
                cronEntries.push(trimmedLine);
            } else if (trimmedLine.startsWith("#")) {
                if (i + 1 < lines.length && !lines[i + 1].trim().startsWith("#") && lines[i + 1].trim()) {
                    currentComment = trimmedLine;
                } else {
                    cronEntries.push(trimmedLine);
                }
            } else {
                if (jobIndex !== targetJobIndex) {
                    const entryWithComment = currentComment
                        ? `${currentComment}\n${trimmedLine}`
                        : trimmedLine;
                    cronEntries.push(entryWithComment);
                }
                jobIndex++;
                currentComment = "";
            }
        }

        const newCron = cronEntries.join("\n") + "\n";
        await writeCronFiles(newCron);
        return true;
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
        const cronContent = await readCronFiles();
        const lines = cronContent.split("\n");
        let currentComment = "";
        let cronEntries: string[] = [];
        let jobIndex = 0;
        let targetJobIndex = parseInt(id.replace("unix-", ""));

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("# User:") || trimmedLine.startsWith("# System Crontab")) {
                cronEntries.push(trimmedLine);
            } else if (trimmedLine.startsWith("#")) {
                if (i + 1 < lines.length && !lines[i + 1].trim().startsWith("#") && lines[i + 1].trim()) {
                    currentComment = trimmedLine;
                } else {
                    cronEntries.push(trimmedLine);
                }
            } else {
                if (jobIndex === targetJobIndex) {
                    const newEntry = comment
                        ? `# ${comment}\n${schedule} ${command}`
                        : `${schedule} ${command}`;
                    cronEntries.push(newEntry);
                } else {
                    const entryWithComment = currentComment
                        ? `${currentComment}\n${trimmedLine}`
                        : trimmedLine;
                    cronEntries.push(entryWithComment);
                }
                jobIndex++;
                currentComment = "";
            }
        }

        const newCron = cronEntries.join("\n") + "\n";
        await writeCronFiles(newCron);
        return true;
    } catch (error) {
        console.error("Error updating cron job:", error);
    }

    return false;
}
