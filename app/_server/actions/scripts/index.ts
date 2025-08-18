"use server";

import { revalidatePath } from "next/cache";
import { writeFile, readFile, unlink, mkdir, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { SCRIPTS_DIR } from "@/app/_utils/scripts";

const execAsync = promisify(exec);

export interface Script {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  filename: string;
}

const SCRIPTS_METADATA_FILE = join(
  process.cwd(),
  "data",
  "scripts-metadata.json"
);

// Function to sanitize script names for filenames
function sanitizeScriptName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

// Function to generate unique filename
async function generateUniqueFilename(baseName: string): Promise<string> {
  const scripts = await readScriptsMetadata();
  const sanitizedName = sanitizeScriptName(baseName);
  let filename = `${sanitizedName}.sh`;
  let counter = 1;

  // Check if filename already exists
  while (scripts.some((script) => script.filename === filename)) {
    filename = `${sanitizedName}-${counter}.sh`;
    counter++;
  }

  return filename;
}

async function ensureScriptsDirectory() {
  if (!existsSync(SCRIPTS_DIR)) {
    await mkdir(SCRIPTS_DIR, { recursive: true });
  }

  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  if (!existsSync(SCRIPTS_METADATA_FILE)) {
    await writeFile(SCRIPTS_METADATA_FILE, JSON.stringify([], null, 2));
  }
}

async function ensureHostScriptsDirectory() {
  const hostScriptsDir = join(process.cwd(), "scripts");
  if (!existsSync(hostScriptsDir)) {
    await mkdir(hostScriptsDir, { recursive: true });
  }
}

async function readScriptsMetadata(): Promise<Script[]> {
  await ensureScriptsDirectory();
  try {
    const data = await readFile(SCRIPTS_METADATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading scripts metadata:", error);
    return [];
  }
}

async function writeScriptsMetadata(scripts: Script[]) {
  await ensureScriptsDirectory();
  await writeFile(SCRIPTS_METADATA_FILE, JSON.stringify(scripts, null, 2));
}

async function saveScriptFile(filename: string, content: string) {
  await ensureScriptsDirectory();

  // Ensure both container and host scripts directories exist
  await ensureHostScriptsDirectory();

  const scriptPath = join(SCRIPTS_DIR, filename);

  // Add shebang if not present
  const scriptContent = content.startsWith("#!/")
    ? content
    : `#!/bin/bash\n${content}`;

  await writeFile(scriptPath, scriptContent, "utf8");

  // Make the script executable
  try {
    await execAsync(`chmod +x "${scriptPath}"`);
  } catch (error) {
    console.error("Error making script executable:", error);
  }
}

async function deleteScriptFile(filename: string) {
  const scriptPath = join(SCRIPTS_DIR, filename);
  if (existsSync(scriptPath)) {
    await unlink(scriptPath);
  }
}

export async function fetchScripts(): Promise<Script[]> {
  return await readScriptsMetadata();
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

    const scripts = await readScriptsMetadata();
    const scriptId = `script_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const filename = await generateUniqueFilename(name);

    const newScript: Script = {
      id: scriptId,
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
      filename,
    };

    // Save the actual script file
    await saveScriptFile(filename, content);

    // Save metadata (without content)
    scripts.push(newScript);
    await writeScriptsMetadata(scripts);
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

    const scripts = await readScriptsMetadata();
    const scriptIndex = scripts.findIndex((s) => s.id === id);

    if (scriptIndex === -1) {
      return { success: false, message: "Script not found" };
    }

    const oldScript = scripts[scriptIndex];

    // Update the actual script file
    await saveScriptFile(oldScript.filename, content);

    // Update metadata (without content)
    scripts[scriptIndex] = {
      ...oldScript,
      name,
      description: description || "",
    };

    await writeScriptsMetadata(scripts);
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
    const scripts = await readScriptsMetadata();
    const scriptToDelete = scripts.find((s) => s.id === id);

    if (!scriptToDelete) {
      return { success: false, message: "Script not found" };
    }

    // Delete the actual script file
    await deleteScriptFile(scriptToDelete.filename);

    // Update metadata
    const filteredScripts = scripts.filter((s) => s.id !== id);
    await writeScriptsMetadata(filteredScripts);
    revalidatePath("/");

    return { success: true, message: "Script deleted successfully" };
  } catch (error) {
    console.error("Error deleting script:", error);
    return { success: false, message: "Error deleting script" };
  }
}

export async function cloneScript(
  id: string,
  newName: string
): Promise<{ success: boolean; message: string; script?: Script }> {
  try {
    const scripts = await readScriptsMetadata();
    const originalScript = scripts.find((s) => s.id === id);

    if (!originalScript) {
      return { success: false, message: "Script not found" };
    }

    // Get the original script content
    const content = await getScriptContent(originalScript.filename);

    // Create new script with the same content but new name
    const scriptId = `script_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const filename = await generateUniqueFilename(newName);

    const newScript: Script = {
      id: scriptId,
      name: newName,
      description: originalScript.description,
      createdAt: new Date().toISOString(),
      filename,
    };

    // Save the actual script file
    await saveScriptFile(filename, content);

    // Save metadata
    scripts.push(newScript);
    await writeScriptsMetadata(scripts);
    revalidatePath("/");

    return {
      success: true,
      message: "Script cloned successfully",
      script: newScript,
    };
  } catch (error) {
    console.error("Error cloning script:", error);
    return { success: false, message: "Error cloning script" };
  }
}

// Function to get script content from file (for editing)
export async function getScriptContent(filename: string): Promise<string> {
  try {
    const scriptPath = join(SCRIPTS_DIR, filename);
    if (existsSync(scriptPath)) {
      return await readFile(scriptPath, "utf8");
    }
    return "";
  } catch (error) {
    console.error("Error reading script content:", error);
    return "";
  }
}
