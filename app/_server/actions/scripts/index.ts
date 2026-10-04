"use server";

import { revalidatePath } from "next/cache";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { SCRIPTS_DIR } from "@/app/_consts/file";
import { loadAllScripts, Script } from "@/app/_utils/scripts-utils";
import { MAKE_SCRIPT_EXECUTABLE } from "@/app/_consts/commands";
import { isDocker, getHostScriptsPath } from "@/app/_server/actions/global";
import { requireActionAuth } from "@/app/_utils/server-action-auth";
import { isSafePathSegment, toSingleLine } from "@/app/_utils/security-utils";
import { createLogger } from "@/app/_utils/logger";
import { shellQuoteIfNeeded } from "@/app/_utils/shell-utils";

const log = createLogger("scripts");

const execAsync = promisify(exec);

const isSafeScriptFilename = (filename: string): boolean => {
  if (!isSafePathSegment(filename)) {
    log.warn("Rejected unsafe script filename", { filename });
    return false;
  }
  return true;
};

export const getScriptPathForCron = async (
  filename: string
): Promise<string> => {
  await requireActionAuth();
  const docker = await isDocker();

  if (docker) {
    const hostScriptsPath = await getHostScriptsPath();
    if (hostScriptsPath) {
      log.debug("Using host scripts path for cron", { filename, hostScriptsPath });
      return `bash ${shellQuoteIfNeeded(path.join(hostScriptsPath, filename))}`;
    }
    log.warn("Could not determine host scripts path, using container path");
  }

  return `bash ${shellQuoteIfNeeded(path.join(process.cwd(), SCRIPTS_DIR, filename))}`;
};

export const normalizeLineEndings = async (content: string): Promise<string> => {
  await requireActionAuth();
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
};

const sanitizeScriptName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
};

const generateUniqueFilename = async (baseName: string): Promise<string> => {
  const scripts = await loadAllScripts();
  let filename = `${sanitizeScriptName(baseName)}.sh`;
  let counter = 1;

  while (scripts.some((script) => script.filename === filename)) {
    filename = `${sanitizeScriptName(baseName)}-${counter}.sh`;
    counter++;
  }

  return filename;
};

const ensureScriptsDirectory = async () => {
  const scriptsDir = path.join(process.cwd(), SCRIPTS_DIR);
  if (!existsSync(scriptsDir)) {
    await mkdir(scriptsDir, { recursive: true });
  }
};

const saveScriptFile = async (filename: string, content: string) => {
  await ensureScriptsDirectory();

  const scriptPath = path.join(process.cwd(), SCRIPTS_DIR, filename);
  await writeFile(scriptPath, content, "utf8");
  log.debug("Wrote script file", { filename, bytes: content.length });

  try {
    await execAsync(MAKE_SCRIPT_EXECUTABLE(scriptPath));
  } catch (error) {
    log.error(`Failed to set execute permissions on ${scriptPath}`, error);
  }
};

const deleteScriptFile = async (filename: string) => {
  const scriptPath = path.join(process.cwd(), SCRIPTS_DIR, filename);
  if (existsSync(scriptPath)) {
    await unlink(scriptPath);
    log.debug("Deleted script file", { filename });
  }
};

export const fetchScripts = async (): Promise<Script[]> => {
  await requireActionAuth();
  return await loadAllScripts();
};

export const createScript = async (
  formData: FormData
): Promise<{ success: boolean; message: string; script?: Script }> => {
  await requireActionAuth();
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;

    if (!name || !content) {
      log.warn("Create script rejected, name and content are required");
      return { success: false, message: "Name and content are required" };
    }

    const scriptId = `script_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const filename = await generateUniqueFilename(name);

    const metadataHeader = `# @id: ${scriptId}
# @title: ${toSingleLine(name)}
# @description: ${toSingleLine(description)}

`;

    const normalizedContent = await normalizeLineEndings(content);
    const fullContent = metadataHeader + normalizedContent;

    await saveScriptFile(filename, fullContent);
    revalidatePath("/");

    log.info("Script created", { scriptId, filename });
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
    log.error("Error creating script", error);
    return { success: false, message: "Error creating script" };
  }
};

export const updateScript = async (
  formData: FormData
): Promise<{ success: boolean; message: string }> => {
  await requireActionAuth();
  try {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;

    if (!id || !name || !content) {
      log.warn("Update script rejected, missing fields", { scriptId: id });
      return { success: false, message: "ID, name and content are required" };
    }

    const scripts = await loadAllScripts();
    const existingScript = scripts.find((s) => s.id === id);

    if (!existingScript) {
      log.warn("Update script failed, script not found", { scriptId: id });
      return { success: false, message: "Script not found" };
    }

    const metadataHeader = `# @id: ${id}
# @title: ${toSingleLine(name)}
# @description: ${toSingleLine(description)}

`;

    const normalizedContent = await normalizeLineEndings(content);
    const fullContent = metadataHeader + normalizedContent;

    await saveScriptFile(existingScript.filename, fullContent);
    revalidatePath("/");

    log.info("Script updated", {
      scriptId: id,
      filename: existingScript.filename,
    });
    return { success: true, message: "Script updated successfully" };
  } catch (error) {
    log.error("Error updating script", error);
    return { success: false, message: "Error updating script" };
  }
};

export const deleteScript = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  await requireActionAuth();
  try {
    const scripts = await loadAllScripts();
    const script = scripts.find((s) => s.id === id);

    if (!script) {
      log.warn("Delete script failed, script not found", { scriptId: id });
      return { success: false, message: "Script not found" };
    }

    await deleteScriptFile(script.filename);
    revalidatePath("/");

    log.info("Script deleted", { scriptId: id, filename: script.filename });
    return { success: true, message: "Script deleted successfully" };
  } catch (error) {
    log.error("Error deleting script", error);
    return { success: false, message: "Error deleting script" };
  }
};

export const cloneScript = async (
  id: string,
  newName: string
): Promise<{ success: boolean; message: string; script?: Script }> => {
  await requireActionAuth();
  try {
    const scripts = await loadAllScripts();
    const originalScript = scripts.find((s) => s.id === id);

    if (!originalScript) {
      log.warn("Clone script failed, script not found", { scriptId: id });
      return { success: false, message: "Script not found" };
    }

    const scriptId = `script_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const filename = await generateUniqueFilename(newName);

    const originalContent = await getScriptContent(originalScript.filename);

    const metadataHeader = `# @id: ${scriptId}
# @title: ${toSingleLine(newName)}
# @description: ${toSingleLine(originalScript.description)}

`;

    const normalizedContent = await normalizeLineEndings(originalContent);
    const fullContent = metadataHeader + normalizedContent;

    await saveScriptFile(filename, fullContent);
    revalidatePath("/");

    log.info("Script cloned", {
      sourceScriptId: id,
      scriptId,
      filename,
    });
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
    log.error("Error cloning script", error);
    return { success: false, message: "Error cloning script" };
  }
};

export const getScriptContent = async (filename: string): Promise<string> => {
  await requireActionAuth();
  try {
    if (!isSafeScriptFilename(filename)) {
      return "";
    }

    const scriptPath = path.join(process.cwd(), SCRIPTS_DIR, filename);

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
    log.error("Error reading script content", error);
    return "";
  }
};
