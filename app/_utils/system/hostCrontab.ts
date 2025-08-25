import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Execute crontab command on the host system using nsenter to host namespaces
 * This allows the Docker container to manage the host's crontab
 */
async function execHostCrontab(command: string): Promise<string> {
    try {
        // Find the host's init process and use nsenter to execute commands in host context
        // We use PID 1 which should be the host's init process due to pid: "host" in docker-compose
        const { stdout } = await execAsync(
            `nsenter -t 1 -m -u -i -n -p sh -c "${command}"`
        );
        return stdout;
    } catch (error: any) {
        console.error("Error executing host crontab command:", error);
        throw error;
    }
}

// Get the target user for crontab operations by detecting the host user dynamically
async function getTargetUser(): Promise<string> {
    try {
        // If explicitly set via environment variable, use that
        if (process.env.HOST_CRONTAB_USER) {
            return process.env.HOST_CRONTAB_USER;
        }

        // Auto-detect the user by finding the owner of the docker socket
        // This will typically be the user who started docker compose
        const { stdout } = await execAsync('stat -c "%U" /var/run/docker.sock');
        const dockerSocketOwner = stdout.trim();

        // If docker socket is owned by root, try to find the actual user
        // by looking at process tree or mounted directories
        if (dockerSocketOwner === 'root') {
            try {
                // Try to detect from the mounted project directory ownership
                const projectDir = process.env.NEXT_PUBLIC_HOST_PROJECT_DIR;
                if (projectDir) {
                    const dirOwner = await execHostCrontab(`stat -c "%U" "${projectDir}"`);
                    return dirOwner.trim();
                }
            } catch (error) {
                console.warn("Could not detect user from project directory:", error);
            }

            // Fall back to looking for non-root users with home directories
            try {
                const users = await execHostCrontab('getent passwd | grep ":/home/" | head -1 | cut -d: -f1');
                const firstUser = users.trim();
                if (firstUser) {
                    return firstUser;
                }
            } catch (error) {
                console.warn("Could not detect user from passwd:", error);
            }

            // Last resort - return root
            return 'root';
        }

        return dockerSocketOwner;
    } catch (error) {
        console.error("Error detecting target user:", error);
        return 'root'; // Safe fallback
    }
}

export async function readHostCrontab(): Promise<string> {
    try {
        const user = await getTargetUser();
        return await execHostCrontab(`crontab -l -u ${user} 2>/dev/null || echo ""`);
    } catch (error) {
        console.error("Error reading host crontab:", error);
        return "";
    }
}

export async function writeHostCrontab(content: string): Promise<boolean> {
    try {
        const user = await getTargetUser();
        // Ensure content ends with a newline (required by crontab)
        let finalContent = content;
        if (!finalContent.endsWith('\n')) {
            finalContent += '\n';
        }

        // Use base64 encoding to avoid all shell escaping issues
        const base64Content = Buffer.from(finalContent).toString('base64');
        await execHostCrontab(`echo '${base64Content}' | base64 -d | crontab -u ${user} -`);
        return true;
    } catch (error) {
        console.error("Error writing host crontab:", error);
        return false;
    }
}
