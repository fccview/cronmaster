import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const isProcessRunning = async (pid: number): Promise<boolean> => {
  try {
    await execAsync(`kill -0 ${pid} 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
};

export const killProcess = async (pid: number, signal: string = "SIGTERM"): Promise<boolean> => {
  try {
    await execAsync(`kill -${signal} ${pid} 2>/dev/null`);
    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error);
    return false;
  }
};

export const getProcessInfo = async (pid: number): Promise<string | null> => {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o pid,cmd 2>/dev/null`);
    return stdout.trim();
  } catch {
    return null;
  }
};
