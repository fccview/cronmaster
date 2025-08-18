"use server";

import {
  getCronJobs,
  addCronJob,
  deleteCronJob,
  updateCronJob,
  getSystemInfo,
  type CronJob,
  type SystemInfo,
} from "@/app/_utils/system";
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

export async function fetchSystemInfo(): Promise<SystemInfo> {
  try {
    return await getSystemInfo();
  } catch (error) {
    console.error("Error fetching system info:", error);
    return {
      hostname: "Unknown",
      platform: "Unknown",
      ip: "Unknown",
      uptime: "Unknown",
      memory: {
        total: "Unknown",
        used: "Unknown",
        free: "Unknown",
        usage: 0,
        status: "Unknown",
      },
      cpu: {
        model: "Unknown",
        cores: 0,
        usage: 0,
        status: "Unknown",
      },
      gpu: {
        model: "Unknown",
        status: "Unknown",
      },
      network: {
        latency: 0,
        speed: "Unknown",
        downloadSpeed: 0,
        uploadSpeed: 0,
        status: "Unknown",
      },
      systemStatus: {
        overall: "Unknown",
        details: "Unable to retrieve system information",
      },
    };
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

    if (!schedule) {
      return { success: false, message: "Schedule is required" };
    }

    let finalCommand = command;

    if (selectedScriptId) {
      const { fetchScripts } = await import("../scripts");
      const scripts = await fetchScripts();
      const selectedScript = scripts.find((s) => s.id === selectedScriptId);

      if (selectedScript) {
        finalCommand = getScriptPath(selectedScript.filename);
      } else {
        return { success: false, message: "Selected script not found" };
      }
    } else if (!command) {
      return {
        success: false,
        message: "Command or script selection is required",
      };
    }

    const success = await addCronJob(schedule, finalCommand, comment);
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
      newComment
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
