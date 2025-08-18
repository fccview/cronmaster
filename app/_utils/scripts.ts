import { join } from "path";

// Use explicit path that works both in development and Docker container
const SCRIPTS_DIR = join(process.cwd(), "scripts");

// Get the full path to a script file for cron job execution
export function getScriptPath(filename: string): string {
  return join(SCRIPTS_DIR, filename);
}

// Get the host path for scripts (for cron jobs that run on the host)
export function getHostScriptPath(filename: string): string {
  // Use the host project directory to get the correct absolute path
  // This ensures cron jobs use the actual host path, not the container path
  const hostProjectDir =
    process.env.NEXT_PUBLIC_HOST_PROJECT_DIR || process.cwd();
  const hostScriptsDir = join(hostProjectDir, "scripts");
  return `bash ${join(hostScriptsDir, filename)}`;
}

// Export the scripts directory path for other uses
export { SCRIPTS_DIR };
