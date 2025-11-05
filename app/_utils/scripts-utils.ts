import { promises as fs } from "fs";
import path from "path";
import { SCRIPTS_DIR } from "../_consts/file";

export interface Script {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  filename: string;
}

interface ScriptMetadata {
  id?: string;
  title?: string;
  description?: string;
}

const parseMetadata = (content: string): ScriptMetadata => {
  const metadata: ScriptMetadata = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("# @id:")) {
      metadata.id = trimmedLine.substring(6).trim();
    } else if (trimmedLine.startsWith("# @title:")) {
      metadata.title = trimmedLine.substring(9).trim();
    } else if (trimmedLine.startsWith("# @description:")) {
      metadata.description = trimmedLine.substring(15).trim();
    }
  }

  return metadata;
}

const scanScriptsDirectory = async (dirPath: string): Promise<Script[]> => {
  const scripts: Script[] = [];

  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      if (file.endsWith(".sh")) {
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const metadata = parseMetadata(content);

        if (metadata.id && metadata.title) {
          const stats = await fs.stat(filePath);

          scripts.push({
            id: metadata.id,
            name: metadata.title,
            description: metadata.description || "",
            filename: file,
            createdAt: stats.birthtime.toISOString(),
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
  }

  return scripts;
}

export const loadAllScripts = async (): Promise<Script[]> => {
  const scriptsDir = path.join(process.cwd(), SCRIPTS_DIR);
  return await scanScriptsDirectory(scriptsDir);
}

export const searchScripts = (scripts: Script[], query: string): Script[] => {
  const lowercaseQuery = query.toLowerCase();
  return scripts.filter(
    (script) =>
      script.name.toLowerCase().includes(lowercaseQuery) ||
      script.description.toLowerCase().includes(lowercaseQuery)
  );
}

export const getScriptById = (
  scripts: Script[],
  id: string
): Script | undefined => {
  return scripts.find((script) => script.id === id);
}
