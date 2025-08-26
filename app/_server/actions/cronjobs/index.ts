"use server";

import {
  getCronJobs,
  addCronJob,
  deleteCronJob,
  updateCronJob,
  pauseCronJob,
  resumeCronJob,
  type CronJob,
} from "@/app/_utils/system";
import { getAllTargetUsers } from "@/app/_utils/system/hostCrontab";
import { revalidatePath } from "next/cache";
import { getScriptPath } from "@/app/_utils/scripts";

export async function fetchCronJobs(): Promise<CronJob[]> {
  try {
    return await getCronJobs();
  } catch (error) {
    console.error("Error fetching cron jobs:", error);
    return [];
  }
}

export async function createCronJob(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
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
  } catch (error) {
    console.error("Error creating cron job:", error);
    return { success: false, message: "Error creating cron job" };
  }
}

export async function removeCronJob(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const success = await deleteCronJob(id);
    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job deleted successfully" };
    } else {
      return { success: false, message: "Failed to delete cron job" };
    }
  } catch (error) {
    console.error("Error deleting cron job:", error);
    return { success: false, message: "Error deleting cron job" };
  }
}

export async function editCronJob(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
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
  } catch (error) {
    console.error("Error updating cron job:", error);
    return { success: false, message: "Error updating cron job" };
  }
}

export async function cloneCronJob(
  id: string,
  newComment: string
): Promise<{ success: boolean; message: string }> {
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
  } catch (error) {
    console.error("Error cloning cron job:", error);
    return { success: false, message: "Error cloning cron job" };
  }
}

export async function pauseCronJobAction(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const success = await pauseCronJob(id);
    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job paused successfully" };
    } else {
      return { success: false, message: "Failed to pause cron job" };
    }
  } catch (error) {
    console.error("Error pausing cron job:", error);
    return { success: false, message: "Error pausing cron job" };
  }
}

export async function resumeCronJobAction(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const success = await resumeCronJob(id);
    if (success) {
      revalidatePath("/");
      return { success: true, message: "Cron job resumed successfully" };
    } else {
      return { success: false, message: "Failed to resume cron job" };
    }
  } catch (error) {
    console.error("Error resuming cron job:", error);
    return { success: false, message: "Error resuming cron job" };
  }
}

export async function fetchAvailableUsers(): Promise<string[]> {
  try {
    return await getAllTargetUsers();
  } catch (error) {
    console.error("Error fetching available users:", error);
    return [];
  }
}
