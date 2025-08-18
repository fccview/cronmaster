import { join } from "path";

const SCRIPTS_DIR = join(process.cwd(), "scripts");

export function getScriptPath(filename: string): string {
  return join(SCRIPTS_DIR, filename);
}

export function getHostScriptPath(filename: string): string {
  const hostProjectDir =
    process.env.NEXT_PUBLIC_HOST_PROJECT_DIR || process.cwd();
  const hostScriptsDir = join(hostProjectDir, "scripts");
  return `bash ${join(hostScriptsDir, filename)}`;
}

export { SCRIPTS_DIR };
