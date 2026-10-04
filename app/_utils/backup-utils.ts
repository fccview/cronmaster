import { promises as fs } from "fs";
import path from "path";
import { getCronJobs, type CronJob } from "@/app/_utils/cronjob-utils";
import { isSafePathSegment } from "@/app/_utils/security-utils";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("backup");

const BACKUP_DIR = path.join(process.cwd(), "data", "backup");

const isSafeBackupFilename = (filename: string): boolean => {
  if (!isSafePathSegment(filename) || !filename.endsWith(".job")) {
    log.warn("Rejected unsafe backup filename", { filename });
    return false;
  }
  return true;
};

const ensureBackupDirectoryExists = async (): Promise<void> => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    log.error("Error creating backup directory", error);
    throw error;
  }
};

const sanitizeFilename = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
};

export const backupJobToFile = async (job: CronJob): Promise<boolean> => {
  try {
    await ensureBackupDirectoryExists();

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

    const filename = `${sanitizeFilename(job.id)}.job`;
    const filepath = path.join(BACKUP_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(jobData, null, 2), "utf8");
    log.debug("Wrote backup file", { jobId: job.id, filename });

    return true;
  } catch (error) {
    log.error(`Error backing up job ${job.id}`, error);
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
    log.debug("Backing up all jobs", { total: cronJobs.length });

    let successCount = 0;

    for (const job of cronJobs) {
      const success = await backupJobToFile(job);
      if (success) {
        successCount++;
      }
    }

    return {
      success: successCount === cronJobs.length,
      count: successCount,
    };
  } catch (error) {
    log.error("Error backing up all jobs", error);
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
    log.error("Error listing backup files", error);
    return [];
  }
};

export const readBackupFile = async (
  filename: string
): Promise<CronJob | null> => {
  try {
    if (!isSafeBackupFilename(filename)) {
      return null;
    }
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
    log.error(`Error reading backup file ${filename}`, error);
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
    log.debug("Found backup files", { count: jobFiles.length });

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
          log.error(`Error reading backup file ${filename}`, error);
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
    log.error("Error getting all backup files", error);
    return [];
  }
};

export const restoreJobFromBackup = async (
  filename: string
): Promise<{ success: boolean; job?: CronJob }> => {
  try {
    const job = await readBackupFile(filename);
    if (!job) {
      log.warn("Backup file could not be read", { filename });
      return { success: false };
    }

    return { success: true, job };
  } catch (error) {
    log.error(`Error restoring job from backup ${filename}`, error);
    return { success: false };
  }
};

export const deleteBackupFile = async (filename: string): Promise<boolean> => {
  try {
    if (!isSafeBackupFilename(filename)) {
      return false;
    }
    const filepath = path.join(BACKUP_DIR, filename);
    await fs.unlink(filepath);
    log.debug("Deleted backup file", { filename });
    return true;
  } catch (error) {
    log.error(`Error deleting backup file ${filename}`, error);
    return false;
  }
};
