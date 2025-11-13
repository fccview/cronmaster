"use server";

import {
  getCronJobs,
  addCronJob,
  cleanupCrontab,
  readUserCrontab,
  writeUserCrontab,
  findJobIndex,
  updateCronJob,
  type CronJob,
} from "@/app/_utils/cronjob-utils";
import { getAllTargetUsers } from "@/app/_utils/crontab-utils";
import { revalidatePath } from "next/cache";
import { getScriptPathForCron } from "@/app/_server/actions/scripts";
import { isDocker } from "@/app/_server/actions/global";
import {
  runJobSynchronously,
  runJobInBackground,
} from "@/app/_utils/job-execution-utils";
import {
  pauseJobInLines,
  resumeJobInLines,
  deleteJobInLines,
} from "@/app/_utils/line-manipulation-utils";
import { cleanCrontabContent } from "@/app/_utils/files-manipulation-utils";

export const fetchCronJobs = async (): Promise<CronJob[]> => {
  try {
    return await getCronJobs();
  } catch (error) {
    console.error("Error fetching cron jobs:", error);
    return [];
  }
};

export const createCronJob = async (
  formData: FormData
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const schedule = formData.get("schedule") as string;
    const command = formData.get("command") as string;
    const comment = formData.get("comment") as string;
    const selectedScriptId = formData.get("selectedScriptId") as string;
    const user = formData.get("user") as string;
    const logsEnabled = formData.get("logsEnabled") === "true";

    if (!schedule) {
      return { success: false, message: "Schedule is required" };
    }

    let finalCommand = command;

    if (selectedScriptId) {
      const { fetchScripts } = await import("@/app/_server/actions/scripts");
      const scripts = await fetchScripts();
      const selectedScript = scripts.find((s) => s.id === selectedScriptId);

      if (selectedScript) {
        finalCommand = await getScriptPathForCron(selectedScript.filename);
      } else {
        return { success: false, message: "Selected script not found" };
      }
    } else if (!command) {
      return {
        success: false,
        message: "Command or script selection is required",
      };
    }

    const success = await addCronJob(
      schedule,
      finalCommand,
      comment,
      user,
      logsEnabled
    );
    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job created successfully" };
    } else {
      return { success: false, message: "Failed to create cron job" };
    }
  } catch (error: any) {
    console.error("Error creating cron job:", error);
    return {
      success: false,
      message: error.message || "Error creating cron job",
      details: error.stack,
    };
  }
};

export const removeCronJob = async (
  jobData: { id: string; schedule: string; command: string; comment?: string; user: string }
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const cronContent = await readUserCrontab(jobData.user);
    const lines = cronContent.split("\n");

    const jobIndex = findJobIndex(jobData, lines, jobData.user);

    if (jobIndex === -1) {
      return { success: false, message: "Cron job not found in crontab" };
    }

    const newCronEntries = deleteJobInLines(lines, jobIndex);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));
    const success = await writeUserCrontab(jobData.user, newCron);

    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job deleted successfully" };
    } else {
      return { success: false, message: "Failed to delete cron job" };
    }
  } catch (error: any) {
    console.error("Error deleting cron job:", error);
    return {
      success: false,
      message: error.message || "Error deleting cron job",
      details: error.stack,
    };
  }
};

export const editCronJob = async (
  formData: FormData
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const id = formData.get("id") as string;
    const schedule = formData.get("schedule") as string;
    const command = formData.get("command") as string;
    const comment = formData.get("comment") as string;
    const logsEnabled = formData.get("logsEnabled") === "true";

    if (!id || !schedule || !command) {
      return { success: false, message: "Missing required fields" };
    }

    const cronJobs = await getCronJobs(false);
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      return { success: false, message: "Cron job not found" };
    }

    const success = await updateCronJob(
      job,
      schedule,
      command,
      comment,
      logsEnabled
    );
    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job updated successfully" };
    } else {
      return { success: false, message: "Failed to update cron job" };
    }
  } catch (error: any) {
    console.error("Error updating cron job:", error);
    return {
      success: false,
      message: error.message || "Error updating cron job",
      details: error.stack,
    };
  }
};

export const cloneCronJob = async (
  id: string,
  newComment: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const cronJobs = await getCronJobs(false);
    const originalJob = cronJobs.find((job) => job.id === id);

    if (!originalJob) {
      return { success: false, message: "Cron job not found" };
    }

    const success = await addCronJob(
      originalJob.schedule,
      originalJob.command,
      newComment,
      originalJob.user
    );

    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job cloned successfully" };
    } else {
      return { success: false, message: "Failed to clone cron job" };
    }
  } catch (error: any) {
    console.error("Error cloning cron job:", error);
    return {
      success: false,
      message: error.message || "Error cloning cron job",
      details: error.stack,
    };
  }
};

export const pauseCronJobAction = async (
  jobData: { id: string; schedule: string; command: string; comment?: string; user: string }
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const cronContent = await readUserCrontab(jobData.user);
    const lines = cronContent.split("\n");

    const jobIndex = findJobIndex(jobData, lines, jobData.user);

    if (jobIndex === -1) {
      return { success: false, message: "Cron job not found in crontab" };
    }

    const newCronEntries = pauseJobInLines(lines, jobIndex, jobData.id);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));
    const success = await writeUserCrontab(jobData.user, newCron);

    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job paused successfully" };
    } else {
      return { success: false, message: "Failed to pause cron job" };
    }
  } catch (error: any) {
    console.error("Error pausing cron job:", error);
    return {
      success: false,
      message: error.message || "Error pausing cron job",
      details: error.stack,
    };
  }
};

export const resumeCronJobAction = async (
  jobData: { id: string; schedule: string; command: string; comment?: string; user: string }
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const cronContent = await readUserCrontab(jobData.user);
    const lines = cronContent.split("\n");

    const jobIndex = findJobIndex(jobData, lines, jobData.user);

    if (jobIndex === -1) {
      return { success: false, message: "Cron job not found in crontab" };
    }

    const newCronEntries = resumeJobInLines(lines, jobIndex, jobData.id);
    const newCron = await cleanCrontabContent(newCronEntries.join("\n"));
    const success = await writeUserCrontab(jobData.user, newCron);

    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job resumed successfully" };
    } else {
      return { success: false, message: "Failed to resume cron job" };
    }
  } catch (error: any) {
    console.error("Error resuming cron job:", error);
    return {
      success: false,
      message: error.message || "Error resuming cron job",
      details: error.stack,
    };
  }
};

export const fetchAvailableUsers = async (): Promise<string[]> => {
  try {
    return await getAllTargetUsers();
  } catch (error) {
    console.error("Error fetching available users:", error);
    return [];
  }
};

export const cleanupCrontabAction = async (): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> => {
  try {
    const success = await cleanupCrontab();
    if (success) {
      revalidatePath("/");
      return { success: true, message: "Crontab cleaned successfully" };
    } else {
      return { success: false, message: "Failed to clean crontab" };
    }
  } catch (error: any) {
    console.error("Error cleaning crontab:", error);
    return {
      success: false,
      message: error.message || "Error cleaning crontab",
      details: error.stack,
    };
  }
};

export const toggleCronJobLogging = async (
  jobData: { id: string; schedule: string; command: string; comment?: string; user: string; logsEnabled?: boolean }
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const newLogsEnabled = !jobData.logsEnabled;

    const success = await updateCronJob(
      jobData,
      jobData.schedule,
      jobData.command,
      jobData.comment || "",
      newLogsEnabled
    );

    if (success) {
      revalidatePath("/");
      return {
        success: true,
        message: newLogsEnabled
          ? "Logging enabled successfully"
          : "Logging disabled successfully",
      };
    } else {
      return { success: false, message: "Failed to toggle logging" };
    }
  } catch (error: any) {
    console.error("Error toggling logging:", error);
    return {
      success: false,
      message: error.message || "Error toggling logging",
      details: error.stack,
    };
  }
};

export const runCronJob = async (
  id: string
): Promise<{
  success: boolean;
  message: string;
  output?: string;
  details?: string;
  runId?: string;
  mode?: "sync" | "async";
}> => {
  try {
    const cronJobs = await getCronJobs(false);
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      return { success: false, message: "Cron job not found" };
    }

    if (job.paused) {
      return { success: false, message: "Cannot run paused cron job" };
    }

    const docker = await isDocker();
    const liveUpdatesEnabled =
      (typeof process.env.LIVE_UPDATES === "boolean" &&
        process.env.LIVE_UPDATES === true) ||
      process.env.LIVE_UPDATES !== "false";

    if (job.logsEnabled && liveUpdatesEnabled) {
      return runJobInBackground(job, docker);
    }

    return runJobSynchronously(job, docker);
  } catch (error: any) {
    console.error("Error running cron job:", error);
    const errorMessage =
      error.stderr || error.message || "Unknown error occurred";
    return {
      success: false,
      message: "Failed to execute cron job",
      output: errorMessage.trim(),
      details: error.stack,
    };
  }
};

export const executeJob = async (
  id: string,
  runInBackground: boolean = true
): Promise<{
  success: boolean;
  message: string;
  output?: string;
  details?: string;
  runId?: string;
  mode?: "sync" | "async";
}> => {
  try {
    const cronJobs = await getCronJobs(false);
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      return { success: false, message: "Cron job not found" };
    }

    if (job.paused) {
      return { success: false, message: "Cannot run paused cron job" };
    }

    const docker = await isDocker();

    if (runInBackground) {
      return runJobInBackground(job, docker);
    }

    return runJobSynchronously(job, docker);
  } catch (error: any) {
    console.error("Error executing cron job:", error);
    const errorMessage =
      error.stderr || error.message || "Unknown error occurred";
    return {
      success: false,
      message: "Failed to execute cron job",
      output: errorMessage.trim(),
      details: error.stack,
    };
  }
};

export const backupCronJob = async (
  job: CronJob
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const {
      backupJobToFile,
    } = await import("@/app/_utils/backup-utils");
    const success = await backupJobToFile(job);
    if (success) {
      return { success: true, message: "Cron job backed up successfully" };
    } else {
      return { success: false, message: "Failed to backup cron job" };
    }
  } catch (error: any) {
    console.error("Error backing up cron job:", error);
    return {
      success: false,
      message: error.message || "Error backing up cron job",
      details: error.stack,
    };
  }
};

export const backupAllCronJobs = async (): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> => {
  try {
    const {
      backupAllJobsToFiles,
    } = await import("@/app/_utils/backup-utils");
    const result = await backupAllJobsToFiles();
    if (result.success) {
      return {
        success: true,
        message: `Backed up ${result.count} cron job(s) successfully`,
      };
    } else {
      return { success: false, message: "Failed to backup cron jobs" };
    }
  } catch (error: any) {
    console.error("Error backing up all cron jobs:", error);
    return {
      success: false,
      message: error.message || "Error backing up all cron jobs",
      details: error.stack,
    };
  }
};

export const fetchBackupFiles = async (): Promise<Array<{
  filename: string;
  job: CronJob;
  backedUpAt: string;
}>> => {
  try {
    const {
      getAllBackupFiles,
    } = await import("@/app/_utils/backup-utils");
    return await getAllBackupFiles();
  } catch (error) {
    console.error("Error fetching backup files:", error);
    return [];
  }
};

export const restoreCronJob = async (
  filename: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const {
      restoreJobFromBackup,
    } = await import("@/app/_utils/backup-utils");

    const result = await restoreJobFromBackup(filename);

    if (!result.success || !result.job) {
      return { success: false, message: "Failed to read backup file" };
    }

    const job = result.job;
    const success = await addCronJob(
      job.schedule,
      job.command,
      job.comment || "",
      job.user,
      job.logsEnabled || false
    );

    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job restored successfully" };
    } else {
      return { success: false, message: "Failed to restore cron job" };
    }
  } catch (error: any) {
    console.error("Error restoring cron job:", error);
    return {
      success: false,
      message: error.message || "Error restoring cron job",
      details: error.stack,
    };
  }
};

export const deleteBackup = async (
  filename: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const {
      deleteBackupFile,
    } = await import("@/app/_utils/backup-utils");

    const success = await deleteBackupFile(filename);

    if (success) {
      return { success: true, message: "Backup deleted successfully" };
    } else {
      return { success: false, message: "Failed to delete backup" };
    }
  } catch (error: any) {
    console.error("Error deleting backup:", error);
    return {
      success: false,
      message: error.message || "Error deleting backup",
      details: error.stack,
    };
  }
};

export const restoreAllCronJobs = async (): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> => {
  try {
    const {
      getAllBackupFiles,
    } = await import("@/app/_utils/backup-utils");

    const backups = await getAllBackupFiles();

    if (backups.length === 0) {
      return { success: false, message: "No backup files found" };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const backup of backups) {
      const job = backup.job;
      const success = await addCronJob(
        job.schedule,
        job.command,
        job.comment || "",
        job.user,
        job.logsEnabled || false
      );

      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    revalidatePath("/");

    if (failedCount === 0) {
      return {
        success: true,
        message: `Successfully restored ${successCount} cron job(s)`,
      };
    } else {
      return {
        success: true,
        message: `Restored ${successCount} job(s), ${failedCount} failed`,
      };
    }
  } catch (error: any) {
    console.error("Error restoring all cron jobs:", error);
    return {
      success: false,
      message: error.message || "Error restoring all cron jobs",
      details: error.stack,
    };
  }
};
