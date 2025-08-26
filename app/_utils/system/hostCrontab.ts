import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function execHostCrontab(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `nsenter -t 1 -m -u -i -n -p sh -c "${command}"`
    );
    return stdout;
  } catch (error: any) {
    console.error("Error executing host crontab command:", error);
    throw error;
  }
}

async function getTargetUser(): Promise<string> {
  try {
    if (process.env.HOST_CRONTAB_USER) {
      return process.env.HOST_CRONTAB_USER;
    }

    const { stdout } = await execAsync('stat -c "%U" /var/run/docker.sock');
    const dockerSocketOwner = stdout.trim();

    if (dockerSocketOwner === "root") {
      try {
        const projectDir = process.env.HOST_PROJECT_DIR;

        if (projectDir) {
          const dirOwner = await execHostCrontab(
            `stat -c "%U" "${projectDir}"`
          );
          return dirOwner.trim();
        }
      } catch (error) {
        console.warn("Could not detect user from project directory:", error);
      }

      try {
        const users = await execHostCrontab(
          'getent passwd | grep ":/home/" | head -1 | cut -d: -f1'
        );
        const firstUser = users.trim();
        if (firstUser) {
          return firstUser;
        }
      } catch (error) {
        console.warn("Could not detect user from passwd:", error);
      }

      return "root";
    }

    return dockerSocketOwner;
  } catch (error) {
    console.error("Error detecting target user:", error);
    return "root";
  }
}

export async function readHostCrontab(): Promise<string> {
  try {
    const user = await getTargetUser();
    return await execHostCrontab(
      `crontab -l -u ${user} 2>/dev/null || echo ""`
    );
  } catch (error) {
    console.error("Error reading host crontab:", error);
    return "";
  }
}

export async function writeHostCrontab(content: string): Promise<boolean> {
  try {
    const user = await getTargetUser();
    let finalContent = content;
    if (!finalContent.endsWith("\n")) {
      finalContent += "\n";
    }

    const base64Content = Buffer.from(finalContent).toString("base64");
    await execHostCrontab(
      `echo '${base64Content}' | base64 -d | crontab -u ${user} -`
    );
    return true;
  } catch (error) {
    console.error("Error writing host crontab:", error);
    return false;
  }
}
