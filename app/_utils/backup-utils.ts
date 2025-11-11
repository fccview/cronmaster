import { promises as fs } from "fs";
import path from "path";
import { getCronJobs, type CronJob } from "@/app/_utils/cronjob-utils";

const BACKUP_DIR = path.join(process.cwd(), "data", "backup");

const ensureBackupDirectoryExists = async (): Promise<void> => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating backup directory:", error);
    throw error;
  }
};

const sanitizeFilename = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
};

export const backupJobToFile = async (id: string): Promise<boolean> => {
  try {
    await ensureBackupDirectoryExists();

    const cronJobs = await getCronJobs(false);
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      console.error(`Job with id ${id} not found`);
      return false;
    }

    const jobData = {
      id: job.id,
      schedule: job.schedule,
      command: job.command,
      comment: job.comment || "",
      user: job.user,
      paused: job.paused || false,
      logsEnabled: job.logsEnabled || false,
      backedUpAt: new Date().toISOString(),
    };

    const filename = `${sanitizeFilename(id)}.job`;
    const filepath = path.join(BACKUP_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(jobData, null, 2), "utf8");

    return true;
  } catch (error) {
    console.error(`Error backing up job ${id}:`, error);
    return false;
  }
};

export const backupAllJobsToFiles = async (): Promise<{
  success: boolean;
  count: number;
}> => {
  try {
    await ensureBackupDirectoryExists();

    const cronJobs = await getCronJobs(false);

    let successCount = 0;

    for (const job of cronJobs) {
      const success = await backupJobToFile(job.id);
      if (success) {
        successCount++;
      }
    }

    return {
      success: successCount === cronJobs.length,
      count: successCount,
    };
  } catch (error) {
    console.error("Error backing up all jobs:", error);
    return {
      success: false,
      count: 0,
    };
  }
};

export const listBackupFiles = async (): Promise<string[]> => {
  try {
    await ensureBackupDirectoryExists();

    const files = await fs.readdir(BACKUP_DIR);
    return files.filter((file) => file.endsWith(".job"));
  } catch (error) {
    console.error("Error listing backup files:", error);
    return [];
  }
};

export const readBackupFile = async (
  filename: string
): Promise<CronJob | null> => {
  try {
    const filepath = path.join(BACKUP_DIR, filename);
    const content = await fs.readFile(filepath, "utf8");
    const jobData = JSON.parse(content);

    return {
      id: jobData.id,
      schedule: jobData.schedule,
      command: jobData.command,
      comment: jobData.comment,
      user: jobData.user,
      paused: jobData.paused,
      logsEnabled: jobData.logsEnabled,
    };
  } catch (error) {
    console.error(`Error reading backup file ${filename}:`, error);
    return null;
  }
};

export const getAllBackupFiles = async (): Promise<
  Array<{
    filename: string;
    job: CronJob;
    backedUpAt: string;
  }>
> => {
  try {
    await ensureBackupDirectoryExists();

    const files = await fs.readdir(BACKUP_DIR);
    const jobFiles = files.filter((file) => file.endsWith(".job"));

    const backups = await Promise.all(
      jobFiles.map(async (filename) => {
        try {
          const filepath = path.join(BACKUP_DIR, filename);
          const content = await fs.readFile(filepath, "utf8");
          const jobData = JSON.parse(content);

          return {
            filename,
            job: {
              id: jobData.id,
              schedule: jobData.schedule,
              command: jobData.command,
              comment: jobData.comment,
              user: jobData.user,
              paused: jobData.paused,
              logsEnabled: jobData.logsEnabled,
            } as CronJob,
            backedUpAt: jobData.backedUpAt,
          };
        } catch (error) {
          console.error(`Error reading backup file ${filename}:`, error);
          return null;
        }
      })
    );

    return backups.filter((backup) => backup !== null) as Array<{
      filename: string;
      job: CronJob;
      backedUpAt: string;
    }>;
  } catch (error) {
    console.error("Error getting all backup files:", error);
    return [];
  }
};

export const restoreJobFromBackup = async (
  filename: string
): Promise<{ success: boolean; job?: CronJob }> => {
  try {
    const job = await readBackupFile(filename);
    if (!job) {
      return { success: false };
    }

    return { success: true, job };
  } catch (error) {
    console.error(`Error restoring job from backup ${filename}:`, error);
    return { success: false };
  }
};

export const deleteBackupFile = async (filename: string): Promise<boolean> => {
  try {
    const filepath = path.join(BACKUP_DIR, filename);
    await fs.unlink(filepath);
    return true;
  } catch (error) {
    console.error(`Error deleting backup file ${filename}:`, error);
    return false;
  }
};
