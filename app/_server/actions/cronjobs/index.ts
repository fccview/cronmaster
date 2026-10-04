"use server";

import {
  getCronJobs,
  addCronJob,
  modifyJobInCrontab,
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
  describeJobExecutionError,
} from "@/app/_utils/job-execution-utils";
import { unwrapCommand } from "@/app/_utils/wrapper-utils";
import {
  pauseJobInLines,
  resumeJobInLines,
  deleteJobInLines,
} from "@/app/_utils/line-manipulation-utils";
import { commandFailure, createLogger } from "@/app/_utils/logger";
import { resolveJobCommand } from "@/app/_utils/script-command-utils";
import { requireActionAuth } from "@/app/_utils/server-action-auth";
import {
  debugDetails,
  isSafeJobId,
  isValidCronSchedule,
} from "@/app/_utils/security-utils";
import { getErrorMessage } from "@/app/_utils/error-utils";
import { isLiveUpdatesEnabled } from "@/app/_utils/sse-broadcaster";

const log = createLogger("job");

const resolveCommandFromForm = async (formData: FormData) => {
  const { fetchScripts } = await import("@/app/_server/actions/scripts");
  return resolveJobCommand({
    command: formData.get("command") as string | null,
    selectedScriptId: formData.get("selectedScriptId") as string | null,
    scripts: fetchScripts,
    getScriptPath: getScriptPathForCron,
  });
};

export const fetchCronJobs = async (): Promise<CronJob[]> => {
  await requireActionAuth();
  try {
    return await getCronJobs();
  } catch (error) {
    log.error("Error fetching cron jobs", error);
    return [];
  }
};

export const createCronJob = async (
  formData: FormData
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  try {
    const schedule = formData.get("schedule") as string;
    const comment = formData.get("comment") as string;
    const user = formData.get("user") as string;
    const logsEnabled = formData.get("logsEnabled") === "true";

    if (!schedule) {
      log.warn("Create job rejected, schedule missing", { user });
      return { success: false, message: "Schedule is required" };
    }

    if (!isValidCronSchedule(schedule)) {
      return { success: false, message: "Invalid cron schedule" };
    }

    const resolved = await resolveCommandFromForm(formData);
    if (!resolved.success) {
      log.warn("Create job rejected", { reason: resolved.message, user });
      return resolved;
    }

    const success = await addCronJob(
      schedule,
      resolved.command,
      comment,
      user,
      logsEnabled
    );
    if (success) {
      revalidatePath("/");
      log.info("Job created", {
        user,
        schedule,
        scriptId: formData.get("selectedScriptId") || undefined,
        logsEnabled,
      });
      log.debug("Created job command", { user, command: resolved.command });
      return { success: true, message: "Cron job created successfully" };
    } else {
      log.warn("Failed to create job", { user, schedule });
      return { success: false, message: "Failed to create cron job" };
    }
  } catch (error: unknown) {
    log.error("Error creating cron job", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error creating cron job",
      details: debugDetails(error),
    };
  }
};

type JobRef = {
  id: string;
  schedule: string;
  command: string;
  comment?: string;
  user: string;
};

type ActionResult = { success: boolean; message: string; details?: string };

type LineTransform = (lines: string[], index: number, id: string) => string[];

const JOB_LINE_ACTIONS: Record<
  "delete" | "pause" | "resume",
  { past: string; ing: string; transform: LineTransform }
> = {
  delete: {
    past: "deleted",
    ing: "deleting",
    transform: (lines, index) => deleteJobInLines(lines, index),
  },
  pause: { past: "paused", ing: "pausing", transform: pauseJobInLines },
  resume: { past: "resumed", ing: "resuming", transform: resumeJobInLines },
};

const applyJobLineAction = async (
  action: keyof typeof JOB_LINE_ACTIONS,
  jobData: JobRef
): Promise<ActionResult> => {
  await requireActionAuth();
  if (!isSafeJobId(jobData?.id)) {
    return { success: false, message: "Invalid cron job id" };
  }

  const { past, ing, transform } = JOB_LINE_ACTIONS[action];
  const context = { jobId: jobData.id, user: jobData.user };

  try {
    const result = await modifyJobInCrontab(jobData, (lines, index) =>
      transform(lines, index, jobData.id)
    );

    if (result === "not-found") {
      log.warn(`Failed to ${action} job, not found in crontab`, context);
      return { success: false, message: "Cron job not found in crontab" };
    }

    if (result === "write-failed") {
      log.warn(`Failed to ${action} job`, context);
      return { success: false, message: `Failed to ${action} cron job` };
    }

    revalidatePath("/");
    log.info(`Job ${past}`, context);
    return { success: true, message: `Cron job ${past} successfully` };
  } catch (error: unknown) {
    log.error(`Error ${ing} cron job`, error);
    return {
      success: false,
      message: getErrorMessage(error) || `Error ${ing} cron job`,
      details: debugDetails(error),
    };
  }
};

export const removeCronJob = async (jobData: JobRef): Promise<ActionResult> =>
  applyJobLineAction("delete", jobData);

export const editCronJob = async (
  formData: FormData
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  try {
    const id = formData.get("id") as string;
    const schedule = formData.get("schedule") as string;
    const comment = formData.get("comment") as string;
    const logsEnabled = formData.get("logsEnabled") === "true";

    if (!id || !schedule) {
      log.warn("Update job rejected, missing required fields", { jobId: id });
      return { success: false, message: "Missing required fields" };
    }

    if (!isValidCronSchedule(schedule)) {
      return { success: false, message: "Invalid cron schedule" };
    }

    const resolved = await resolveCommandFromForm(formData);
    if (!resolved.success) {
      log.warn("Update job rejected", { jobId: id, reason: resolved.message });
      return resolved;
    }

    const cronJobs = await getCronJobs(false);
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      log.warn("Update job failed, job not found", { jobId: id });
      return { success: false, message: "Cron job not found" };
    }

    const success = await updateCronJob(
      job,
      schedule,
      resolved.command,
      comment,
      logsEnabled
    );
    if (success) {
      revalidatePath("/");
      log.info("Job updated", {
        jobId: id,
        user: job.user,
        schedule,
        logsEnabled,
      });
      log.debug("Updated job command", { jobId: id, command: resolved.command });
      return { success: true, message: "Cron job updated successfully" };
    } else {
      log.warn("Failed to update job", { jobId: id, user: job.user });
      return { success: false, message: "Failed to update cron job" };
    }
  } catch (error: unknown) {
    log.error("Error updating cron job", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error updating cron job",
      details: debugDetails(error),
    };
  }
};

export const cloneCronJob = async (
  id: string,
  newComment: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  try {
    const cronJobs = await getCronJobs(false);
    const originalJob = cronJobs.find((job) => job.id === id);

    if (!originalJob) {
      log.warn("Clone job failed, job not found", { jobId: id });
      return { success: false, message: "Cron job not found" };
    }

    const success = await addCronJob(
      originalJob.schedule,
      unwrapCommand(originalJob.command),
      newComment,
      originalJob.user,
      originalJob.logsEnabled || false
    );

    if (success) {
      revalidatePath("/");
      log.info("Job cloned", { sourceJobId: id, user: originalJob.user });
      return { success: true, message: "Cron job cloned successfully" };
    } else {
      log.warn("Failed to clone job", { sourceJobId: id, user: originalJob.user });
      return { success: false, message: "Failed to clone cron job" };
    }
  } catch (error: unknown) {
    log.error("Error cloning cron job", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error cloning cron job",
      details: debugDetails(error),
    };
  }
};

export const pauseCronJobAction = async (jobData: JobRef): Promise<ActionResult> =>
  applyJobLineAction("pause", jobData);

export const resumeCronJobAction = async (jobData: JobRef): Promise<ActionResult> =>
  applyJobLineAction("resume", jobData);

export const fetchAvailableUsers = async (): Promise<string[]> => {
  await requireActionAuth();
  try {
    return await getAllTargetUsers();
  } catch (error) {
    log.error("Error fetching available users", error);
    return [];
  }
};

export const toggleCronJobLogging = async (
  jobData: { id: string; schedule: string; command: string; comment?: string; user: string; logsEnabled?: boolean }
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  if (!isSafeJobId(jobData?.id)) {
    return { success: false, message: "Invalid cron job id" };
  }
  try {
    const newLogsEnabled = !jobData.logsEnabled;
    log.info("Toggling job logging", {
      jobId: jobData.id,
      user: jobData.user,
      logsEnabled: newLogsEnabled,
    });

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
      log.warn("Failed to toggle job logging", { jobId: jobData.id });
      return { success: false, message: "Failed to toggle logging" };
    }
  } catch (error: unknown) {
    log.error("Error toggling logging", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error toggling logging",
      details: debugDetails(error),
    };
  }
};

type RunJobResult = {
  success: boolean;
  message: string;
  output?: string;
  details?: string;
  runId?: string;
  mode?: "sync" | "async";
};

const startJob = async (
  id: string,
  shouldRunInBackground: (job: CronJob) => boolean
): Promise<RunJobResult> => {
  await requireActionAuth();
  try {
    const cronJobs = await getCronJobs(false);
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      log.warn("Run job failed, job not found", { jobId: id });
      return { success: false, message: "Cron job not found" };
    }

    if (job.paused) {
      log.warn("Run job rejected, job is paused", { jobId: id });
      return { success: false, message: "Cannot run paused cron job" };
    }

    const docker = await isDocker();
    const background = shouldRunInBackground(job);

    log.info("Running job on demand", {
      jobId: id,
      user: job.user,
      background,
      docker,
    });

    return background
      ? await runJobInBackground(job, docker)
      : await runJobSynchronously(job, docker);
  } catch (error: unknown) {
    log.error("Error running cron job", commandFailure(error));
    const { message, output } = describeJobExecutionError(error);
    return {
      success: false,
      message,
      output,
      details: debugDetails(error),
    };
  }
};

export const runCronJob = async (id: string): Promise<RunJobResult> =>
  startJob(id, (job) => !!job.logsEnabled && isLiveUpdatesEnabled());

export const executeJob = async (
  id: string,
  runInBackground: boolean = true
): Promise<RunJobResult> => startJob(id, () => runInBackground);

export const backupCronJob = async (
  job: CronJob
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  try {
    const {
      backupJobToFile,
    } = await import("@/app/_utils/backup-utils");
    const success = await backupJobToFile(job);
    if (success) {
      log.info("Job backed up", { jobId: job.id, user: job.user });
      return { success: true, message: "Cron job backed up successfully" };
    } else {
      log.warn("Failed to back up job", { jobId: job.id, user: job.user });
      return { success: false, message: "Failed to backup cron job" };
    }
  } catch (error: unknown) {
    log.error("Error backing up cron job", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error backing up cron job",
      details: debugDetails(error),
    };
  }
};

export const backupAllCronJobs = async (): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> => {
  await requireActionAuth();
  try {
    const {
      backupAllJobsToFiles,
    } = await import("@/app/_utils/backup-utils");
    const result = await backupAllJobsToFiles();
    if (result.success) {
      log.info("All jobs backed up", { count: result.count });
      return {
        success: true,
        message: `Backed up ${result.count} cron job(s) successfully`,
      };
    } else {
      log.warn("Failed to back up all jobs");
      return { success: false, message: "Failed to backup cron jobs" };
    }
  } catch (error: unknown) {
    log.error("Error backing up all cron jobs", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error backing up all cron jobs",
      details: debugDetails(error),
    };
  }
};

export const fetchBackupFiles = async (): Promise<Array<{
  filename: string;
  job: CronJob;
  backedUpAt: string;
}>> => {
  await requireActionAuth();
  try {
    const {
      getAllBackupFiles,
    } = await import("@/app/_utils/backup-utils");
    return await getAllBackupFiles();
  } catch (error) {
    log.error("Error fetching backup files", error);
    return [];
  }
};

const addJobFromBackup = (job: CronJob) =>
  addCronJob(
    job.schedule,
    job.command,
    job.comment || "",
    job.user,
    job.logsEnabled || false
  );

export const restoreCronJob = async (
  filename: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  try {
    const {
      restoreJobFromBackup,
    } = await import("@/app/_utils/backup-utils");

    const result = await restoreJobFromBackup(filename);

    if (!result.success || !result.job) {
      log.warn("Restore failed, could not read backup", { filename });
      return { success: false, message: "Failed to read backup file" };
    }

    const job = result.job;
    const success = await addJobFromBackup(job);

    if (success) {
      revalidatePath("/");
      log.info("Job restored from backup", {
        filename,
        jobId: job.id,
        user: job.user,
      });
      return { success: true, message: "Cron job restored successfully" };
    } else {
      log.warn("Failed to restore job from backup", { filename, user: job.user });
      return { success: false, message: "Failed to restore cron job" };
    }
  } catch (error: unknown) {
    log.error("Error restoring cron job", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error restoring cron job",
      details: debugDetails(error),
    };
  }
};

export const deleteBackup = async (
  filename: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  await requireActionAuth();
  try {
    const {
      deleteBackupFile,
    } = await import("@/app/_utils/backup-utils");

    const success = await deleteBackupFile(filename);

    if (success) {
      log.info("Backup deleted", { filename });
      return { success: true, message: "Backup deleted successfully" };
    } else {
      log.warn("Failed to delete backup", { filename });
      return { success: false, message: "Failed to delete backup" };
    }
  } catch (error: unknown) {
    log.error("Error deleting backup", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error deleting backup",
      details: debugDetails(error),
    };
  }
};

export const restoreAllCronJobs = async (): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> => {
  await requireActionAuth();
  try {
    const {
      getAllBackupFiles,
    } = await import("@/app/_utils/backup-utils");

    const backups = await getAllBackupFiles();

    if (backups.length === 0) {
      log.info("Restore all skipped, no backups found");
      return { success: false, message: "No backup files found" };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const backup of backups) {
      let success = false;
      try {
        success = await addJobFromBackup(backup.job);
      } catch (error) {
        log.error(`Error restoring backup ${backup.filename}`, error);
      }

      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    revalidatePath("/");

    log.info("Restored all jobs from backups", {
      restored: successCount,
      failed: failedCount,
    });
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
  } catch (error: unknown) {
    log.error("Error restoring all cron jobs", error);
    return {
      success: false,
      message: getErrorMessage(error) || "Error restoring all cron jobs",
      details: debugDetails(error),
    };
  }
};
