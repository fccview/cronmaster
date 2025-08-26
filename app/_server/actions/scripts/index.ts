"use server";

import { revalidatePath } from "next/cache";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { SCRIPTS_DIR } from "@/app/_utils/scripts";
import { loadAllScripts, type Script } from "@/app/_utils/scriptScanner";

const execAsync = promisify(exec);

export type { Script } from "@/app/_utils/scriptScanner";

const sanitizeScriptName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

const generateUniqueFilename = async (baseName: string): Promise<string> => {
  const scripts = await loadAllScripts();
  let filename = `${sanitizeScriptName(baseName)}.sh`;
  let counter = 1;

  while (scripts.some((script) => script.filename === filename)) {
    filename = `${sanitizeScriptName(baseName)}-${counter}.sh`;
    counter++;
  }

  return filename;
}

const ensureScriptsDirectory = async () => {
  const scriptsDir = await SCRIPTS_DIR();
  if (!existsSync(scriptsDir)) {
    await mkdir(scriptsDir, { recursive: true });
  }
}

const ensureHostScriptsDirectory = async () => {
  const hostProjectDir = process.env.HOST_PROJECT_DIR || process.cwd();

  const hostScriptsDir = join(hostProjectDir, "scripts");
  if (!existsSync(hostScriptsDir)) {
    await mkdir(hostScriptsDir, { recursive: true });
  }
}

const saveScriptFile = async (filename: string, content: string) => {
  const isDocker = process.env.DOCKER === "true";
  const scriptsDir = isDocker ? "/app/scripts" : await SCRIPTS_DIR();
  await ensureScriptsDirectory();

  const scriptPath = join(scriptsDir, filename);
  await writeFile(scriptPath, content, "utf8");
}

const deleteScriptFile = async (filename: string) => {
  const scriptPath = join(await SCRIPTS_DIR(), filename);
  if (existsSync(scriptPath)) {
    await unlink(scriptPath);
  }
}

export const fetchScripts = async (): Promise<Script[]> => {
  return await loadAllScripts();
}

export const createScript = async (
  formData: FormData
): Promise<{ success: boolean; message: string; script?: Script }> => {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;

    if (!name || !content) {
      return { success: false, message: "Name and content are required" };
    }

    const scriptId = `script_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const filename = await generateUniqueFilename(name);

    const metadataHeader = `# @id: ${scriptId}
# @title: ${name}
# @description: ${description || ""}

`;

    const fullContent = metadataHeader + content;

    await saveScriptFile(filename, fullContent);
    revalidatePath("/");

    const newScript: Script = {
      id: scriptId,
      name,
      description: description || "",
      filename,
      createdAt: new Date().toISOString(),
    };

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

export const updateScript = async (
  formData: FormData
): Promise<{ success: boolean; message: string }> => {
  try {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;

    if (!id || !name || !content) {
      return { success: false, message: "ID, name and content are required" };
    }

    const scripts = await loadAllScripts();
    const existingScript = scripts.find((s) => s.id === id);

    if (!existingScript) {
      return { success: false, message: "Script not found" };
    }

    const metadataHeader = `# @id: ${id}
# @title: ${name}
# @description: ${description || ""}

`;

    const fullContent = metadataHeader + content;

    await saveScriptFile(existingScript.filename, fullContent);
    revalidatePath("/");

    return { success: true, message: "Script updated successfully" };
  } catch (error) {
    console.error("Error updating script:", error);
    return { success: false, message: "Error updating script" };
  }
}

export const deleteScript = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const scripts = await loadAllScripts();
    const script = scripts.find((s) => s.id === id);

    if (!script) {
      return { success: false, message: "Script not found" };
    }

    await deleteScriptFile(script.filename);
    revalidatePath("/");

    return { success: true, message: "Script deleted successfully" };
  } catch (error) {
    console.error("Error deleting script:", error);
    return { success: false, message: "Error deleting script" };
  }
}

export const cloneScript = async (
  id: string,
  newName: string
): Promise<{ success: boolean; message: string; script?: Script }> => {
  try {
    const scripts = await loadAllScripts();
    const originalScript = scripts.find((s) => s.id === id);

    if (!originalScript) {
      return { success: false, message: "Script not found" };
    }

    const scriptId = `script_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const filename = await generateUniqueFilename(newName);

    const originalContent = await getScriptContent(originalScript.filename);

    const metadataHeader = `# @id: ${scriptId}
# @title: ${newName}
# @description: ${originalScript.description}

`;

    const fullContent = metadataHeader + originalContent;

    await saveScriptFile(filename, fullContent);
    revalidatePath("/");

    const newScript: Script = {
      id: scriptId,
      name: newName,
      description: originalScript.description,
      filename,
      createdAt: new Date().toISOString(),
    };

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

export const getScriptContent = async (filename: string): Promise<string> => {
  try {
    const isDocker = process.env.DOCKER === "true";
    const scriptPath = isDocker
      ? join("/app/scripts", filename)
      : join(process.cwd(), "scripts", filename);

    if (existsSync(scriptPath)) {
      const content = await readFile(scriptPath, "utf8");
      const lines = content.split("\n");
      const contentLines: string[] = [];

      let inMetadata = true;
      for (const line of lines) {
        if (line.trim().startsWith("# @")) {
          continue;
        }
        if (line.trim() === "" && inMetadata) {
          continue;
        }
        inMetadata = false;
        contentLines.push(line);
      }

      return contentLines.join("\n").trim();
    }
    return "";
  } catch (error) {
    console.error("Error reading script content:", error);
    return "";
  }
}

export const executeScript = async (filename: string): Promise<{
  success: boolean;
  output: string;
  error: string;
}> => {
  try {
    await ensureHostScriptsDirectory();
    const isDocker = process.env.DOCKER === "true";
    const hostScriptPath = isDocker
      ? join("/app/scripts", filename)
      : join(process.cwd(), "scripts", filename);

    if (!existsSync(hostScriptPath)) {
      return {
        success: false,
        output: "",
        error: "Script file not found",
      };
    }

    const { stdout, stderr } = await execAsync(`bash "${hostScriptPath}"`, {
      timeout: 30000,
    });

    return {
      success: true,
      output: stdout,
      error: stderr,
    };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.message || "Unknown error",
    };
  }
}
