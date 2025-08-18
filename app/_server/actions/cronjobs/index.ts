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
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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
      platform: "Unknown",
      hostname: "Unknown",
      ip: "Unknown",
      uptime: "Unknown",
      memory: {
        total: "Unknown",
        used: "Unknown",
        free: "Unknown",
        usage: 0,
        status: "Unknown",
      },
      cpu: { model: "Unknown", cores: 0, usage: 0, status: "Unknown" },
      gpu: { model: "Unknown", status: "Unknown" },
      network: {
        speed: "Unknown",
        latency: 0,
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
    const scriptContent = formData.get("scriptContent") as string;

    if (!schedule || (!command && !scriptContent)) {
      return { success: false, message: "Missing required fields" };
    }

    let finalCommand = command;

    // If script content is provided, save it as a file
    if (scriptContent) {
      try {
        // Create scripts directory if it doesn't exist
        const scriptsDir = join(process.cwd(), "scripts");
        await mkdir(scriptsDir, { recursive: true });

        // Generate unique filename
        const filename = `script_${Date.now()}.sh`;
        const scriptPath = join(scriptsDir, filename);

        // Add shebang and save the script
        const fullScript = `#!/bin/bash\n${scriptContent}`;
        await writeFile(scriptPath, fullScript, "utf8");

        // Make the script executable
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        await execAsync(`chmod +x "${scriptPath}"`);

        finalCommand = scriptPath;
      } catch (error) {
        console.error("Error saving script:", error);
        return { success: false, message: "Failed to save script file" };
      }
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
