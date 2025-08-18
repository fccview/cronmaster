"use server";

import { revalidatePath } from "next/cache";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export interface Script {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: string;
}

const SCRIPTS_FILE = join(process.cwd(), "data", "scripts.json");

async function ensureScriptsFile() {
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  if (!existsSync(SCRIPTS_FILE)) {
    await writeFile(SCRIPTS_FILE, JSON.stringify([], null, 2));
  }
}

async function readScripts(): Promise<Script[]> {
  await ensureScriptsFile();
  try {
    const data = await readFile(SCRIPTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading scripts:", error);
    return [];
  }
}

async function writeScripts(scripts: Script[]) {
  await ensureScriptsFile();
  await writeFile(SCRIPTS_FILE, JSON.stringify(scripts, null, 2));
}

export async function fetchScripts(): Promise<Script[]> {
  return await readScripts();
}

export async function createScript(
  formData: FormData
): Promise<{ success: boolean; message: string; script?: Script }> {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;

    if (!name || !content) {
      return { success: false, message: "Name and content are required" };
    }

    const scripts = await readScripts();
    const newScript: Script = {
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || "",
      content,
      createdAt: new Date().toISOString(),
    };

    scripts.push(newScript);
    await writeScripts(scripts);
    revalidatePath("/");

    return {
      success: true,
      message: "Script created successfully",
      script: newScript,
    };
  } catch (error) {
    console.error("Error creating script:", error);
    return { success: false, message: "Error creating script" };
  }
}

export async function updateScript(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  try {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;

    if (!id || !name || !content) {
      return { success: false, message: "ID, name, and content are required" };
    }

    const scripts = await readScripts();
    const scriptIndex = scripts.findIndex((s) => s.id === id);

    if (scriptIndex === -1) {
      return { success: false, message: "Script not found" };
    }

    scripts[scriptIndex] = {
      ...scripts[scriptIndex],
      name,
      description: description || "",
      content,
    };

    await writeScripts(scripts);
    revalidatePath("/");

    return { success: true, message: "Script updated successfully" };
  } catch (error) {
    console.error("Error updating script:", error);
    return { success: false, message: "Error updating script" };
  }
}

export async function deleteScript(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const scripts = await readScripts();
    const filteredScripts = scripts.filter((s) => s.id !== id);

    if (filteredScripts.length === scripts.length) {
      return { success: false, message: "Script not found" };
    }

    await writeScripts(filteredScripts);
    revalidatePath("/");

    return { success: true, message: "Script deleted successfully" };
  } catch (error) {
    console.error("Error deleting script:", error);
    return { success: false, message: "Error deleting script" };
  }
}
