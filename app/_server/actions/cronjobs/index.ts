"use server";

import {
  getCronJobs,
  addCronJob,
  deleteCronJob,
  updateCronJob,
  pauseCronJob,
  resumeCronJob,
  cleanupCrontab,
  type CronJob,
} from "@/app/_utils/system";
import {
  getAllTargetUsers,
  getUserInfo,
} from "@/app/_utils/system/hostCrontab";
import { revalidatePath } from "next/cache";
import { getScriptPath } from "@/app/_utils/scripts";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

    if (!schedule) {
      return { success: false, message: "Schedule is required" };
    }

    let finalCommand = command;

    if (selectedScriptId) {
      const { fetchScripts } = await import("../scripts");
      const scripts = await fetchScripts();
      const selectedScript = scripts.find((s) => s.id === selectedScriptId);

      if (selectedScript) {
        finalCommand = await getScriptPath(selectedScript.filename);
      } else {
        return { success: false, message: "Selected script not found" };
      }
    } else if (!command) {
      return {
        success: false,
        message: "Command or script selection is required",
      };
    }

    const success = await addCronJob(schedule, finalCommand, comment, user);
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
  id: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const success = await deleteCronJob(id);
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

    if (!id || !schedule || !command) {
      return { success: false, message: "Missing required fields" };
    }

    const success = await updateCronJob(id, schedule, command, comment);
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
    const cronJobs = await getCronJobs();
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
  id: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const success = await pauseCronJob(id);
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
  id: string
): Promise<{ success: boolean; message: string; details?: string }> => {
  try {
    const success = await resumeCronJob(id);
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

export const runCronJob = async (
  id: string
): Promise<{
  success: boolean;
  message: string;
  output?: string;
  details?: string;
}> => {
  try {
    const cronJobs = await getCronJobs();
    const job = cronJobs.find((j) => j.id === id);

    if (!job) {
      return { success: false, message: "Cron job not found" };
    }

    if (job.paused) {
      return { success: false, message: "Cannot run paused cron job" };
    }

    const isDocker = process.env.DOCKER === "true";
    let command = job.command;

    if (isDocker) {
      const userInfo = await getUserInfo(job.user);

      if (userInfo && userInfo.username !== "root") {
        command = `nsenter -t 1 -m -u -i -n -p sh -c "setpriv --reuid=${userInfo.uid} --regid=${userInfo.gid} --init-groups -- sh -c \\"${job.command}\\""`
      } else {
        command = `nsenter -t 1 -m -u -i -n -p sh -c "${job.command}"`;
      }
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000,
      cwd: process.env.HOME || "/home",
    });

    const output = stdout || stderr || "Command executed successfully";

    return {
      success: true,
      message: "Cron job executed successfully",
      output: output.trim(),
    };
  } catch (error: any) {
    console.error("Error running cron job:", error);
    const errorMessage =
      error.stderr || error.message || "Unknown error occurred";
    return {
      success: false,
      message: "Failed to execute cron job",
      output: errorMessage,
      details: error.stack,
    };
  }
};
