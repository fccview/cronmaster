"use server";

import { join } from "path";

const isDocker = process.env.DOCKER === "true";
const SCRIPTS_DIR = async () => {
  if (isDocker && process.env.HOST_PROJECT_DIR) {
    return `${process.env.HOST_PROJECT_DIR}/scripts`;
  }
  return join(process.cwd(), "scripts");
};

export const getScriptPath = async (filename: string): Promise<string> => {
  return join(await SCRIPTS_DIR(), filename);
}

export const getHostScriptPath = async (filename: string): Promise<string> => {
  const hostProjectDir = process.env.HOST_PROJECT_DIR || process.cwd();

  const hostScriptsDir = join(hostProjectDir, "scripts");
  return `bash ${join(hostScriptsDir, filename)}`;
}

export { SCRIPTS_DIR };
