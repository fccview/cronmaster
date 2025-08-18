import { exec } from "child_process";
import { promisify } from "util";
import { isDocker, readCronFilesDocker, writeCronFilesDocker } from "./docker";

const execAsync = promisify(exec);

export interface CronJob {
    id: string;
    schedule: string;
    command: string;
    comment?: string;
}

async function readCronFiles(): Promise<string> {
    if (!isDocker) {
        try {
            const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
            return stdout;
        } catch (error) {
            console.error("Error reading crontab:", error);
            return "";
        }
    }

    return await readCronFilesDocker();
}

async function writeCronFiles(content: string): Promise<boolean> {
    if (!isDocker) {
        try {
            await execAsync('echo "' + content + '" | crontab -');
            return true;
        } catch (error) {
            console.error("Error writing crontab:", error);
            return false;
        }
    }

    return await writeCronFilesDocker(content);
}

export async function getCronJobs(): Promise<CronJob[]> {
    const jobs: CronJob[] = [];
    console.log("getCronJobs called, isDocker:", isDocker);

    try {
        const cronContent = await readCronFiles();
        console.log("Cron content length:", cronContent.length);
        console.log("Cron content preview:", cronContent.substring(0, 200));
        const lines = cronContent.split("\n");
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
                if (!trimmedLine.startsWith("# User:") && !trimmedLine.startsWith("# System Crontab")) {
                    currentComment = trimmedLine.substring(1).trim();
                }
                return;
            }

            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 6) {
                const schedule = parts.slice(0, 5).join(" ");
                const command = parts.slice(5).join(" ");

                let fullComment = currentComment;
                if (currentUser && currentUser !== "system") {
                    fullComment = fullComment ? `${currentComment} (User: ${currentUser})` : `User: ${currentUser}`;
                } else if (currentUser === "system") {
                    fullComment = fullComment ? `${currentComment} (System)` : "System";
                }

                jobs.push({
                    id: `unix-${jobIndex}`,
                    schedule,
                    command,
                    comment: fullComment,
                });

                currentComment = "";
                jobIndex++;
            }
        });
    } catch (error) {
        console.error("Error getting cron jobs:", error);
    }

    return jobs;
}

export async function addCronJob(
    schedule: string,
    command: string,
    comment: string = ""
): Promise<boolean> {
    try {
        const cronContent = await readCronFiles();

        if (isDocker) {
            const lines = cronContent.split("\n");
            let hasUserSection = false;

            for (const line of lines) {
                if (line.startsWith("# User: ")) {
                    hasUserSection = true;
                    break;
                }
            }

            if (!hasUserSection) {
                const newEntry = comment
                    ? `# User: root\n# ${comment}\n${schedule} ${command}`
                    : `# User: root\n${schedule} ${command}`;
                const newCron = cronContent + "\n" + newEntry;
                await writeCronFiles(newCron);
            } else {
                const newEntry = comment
                    ? `# ${comment}\n${schedule} ${command}`
                    : `${schedule} ${command}`;
                const newCron = cronContent + "\n" + newEntry;
                await writeCronFiles(newCron);
            }
        } else {
            const newEntry = comment
                ? `# ${comment}\n${schedule} ${command}`
                : `${schedule} ${command}`;
            const newCron = cronContent + "\n" + newEntry;
            await writeCronFiles(newCron);
        }

        return true;
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

        lines.forEach((line) => {
            const trimmedLine = line.trim();

            if (!trimmedLine) return;

            if (trimmedLine.startsWith("#")) {
                currentComment = trimmedLine;
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
        });

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

        lines.forEach((line) => {
            const trimmedLine = line.trim();

            if (!trimmedLine) return;

            if (trimmedLine.startsWith("#")) {
                currentComment = trimmedLine;
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
        });

        const newCron = cronEntries.join("\n") + "\n";
        await writeCronFiles(newCron);
        return true;
    } catch (error) {
        console.error("Error updating cron job:", error);
    }

    return false;
}
