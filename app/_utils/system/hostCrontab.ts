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

export async function getAllTargetUsers(): Promise<string[]> {
  try {
    if (process.env.HOST_CRONTAB_USER) {
      return process.env.HOST_CRONTAB_USER.split(",").map((u) => u.trim());
    }

    const isDocker = process.env.DOCKER === "true";
    if (isDocker) {
      const singleUser = await getTargetUser();
      return [singleUser];
    } else {
      try {
        const { stdout } = await execAsync("ls /var/spool/cron/crontabs/");
        const users = stdout
          .trim()
          .split("\n")
          .filter((user) => user.trim());
        return users.length > 0 ? users : ["root"];
      } catch (error) {
        console.error("Error detecting users from crontabs directory:", error);
        return ["root"];
      }
    }
  } catch (error) {
    console.error("Error getting all target users:", error);
    return ["root"];
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

export async function readAllHostCrontabs(): Promise<
  { user: string; content: string }[]
> {
  try {
    const users = await getAllTargetUsers();
    const results: { user: string; content: string }[] = [];

    for (const user of users) {
      try {
        const content = await execHostCrontab(
          `crontab -l -u ${user} 2>/dev/null || echo ""`
        );
        results.push({ user, content });
      } catch (error) {
        console.warn(`Error reading crontab for user ${user}:`, error);
        results.push({ user, content: "" });
      }
    }

    return results;
  } catch (error) {
    console.error("Error reading all host crontabs:", error);
    return [];
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

export async function writeHostCrontabForUser(
  user: string,
  content: string
): Promise<boolean> {
  try {
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
    console.error(`Error writing host crontab for user ${user}:`, error);
    return false;
  }
}
