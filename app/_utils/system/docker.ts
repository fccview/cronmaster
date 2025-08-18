import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const isDocker = process.env.DOCKER === "true";

// Helper function to get host information when in Docker
export async function getHostInfo(): Promise<{ hostname: string; ip: string; uptime: string }> {
    if (isDocker) {
        try {
            // Read hostname from host's /etc/hostname
            const hostname = await fs.readFile("/host/etc/hostname", "utf-8");

            // Read IP from host's network interfaces
            let ipOutput = "";
            try {
                // Try to get IP from hostname -I first
                const { stdout } = await execAsync("hostname -I | awk '{print $1}'");
                ipOutput = stdout;
                console.log("Docker mode: Got IP from hostname -I:", ipOutput);
            } catch (error) {
                // Fallback: try to read from /proc/net/fib_trie
                try {
                    const fibInfo = await fs.readFile("/host/proc/net/fib_trie", "utf-8");
                    const lines = fibInfo.split("\n");
                    for (const line of lines) {
                        const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                        if (match && !match[1].startsWith("127.") && !match[1].startsWith("0.")) {
                            ipOutput = match[1];
                            break;
                        }
                    }
                } catch (fibError) {
                    console.error("Could not determine IP address:", fibError);
                }
            }

            // Read uptime from host's /proc/uptime
            const uptimeContent = await fs.readFile("/host/proc/uptime", "utf-8");
            const uptimeSeconds = parseFloat(uptimeContent.split(" ")[0]);
            const uptime = formatUptime(uptimeSeconds);

            return {
                hostname: hostname.trim(),
                ip: ipOutput.trim(),
                uptime: uptime
            };
        } catch (error) {
            console.error("Error reading host info:", error);
            // Fallback to container info
            const { stdout: hostname } = await execAsync("hostname");
            const { stdout: ip } = await execAsync("hostname -I | awk '{print $1}'");
            const { stdout: uptime } = await execAsync("uptime");
            return {
                hostname: hostname.trim(),
                ip: ip.trim(),
                uptime: parseUptimeOutput(uptime)
            };
        }
    } else {
        // Not in Docker, run commands normally
        const { stdout: hostname } = await execAsync("hostname");
        const { stdout: ip } = await execAsync("hostname -I | awk '{print $1}'");
        const { stdout: uptime } = await execAsync("uptime");
        return {
            hostname: hostname.trim(),
            ip: ip.trim(),
            uptime: parseUptimeOutput(uptime)
        };
    }
}

// Helper function to format uptime
export function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days} days, ${hours} hours`;
    } else if (hours > 0) {
        return `${hours} hours, ${minutes} minutes`;
    } else {
        return `${minutes} minutes`;
    }
}

// Helper function to parse uptime command output and make it clearer
export function parseUptimeOutput(uptimeOutput: string): string {
    // Remove extra whitespace
    const cleanOutput = uptimeOutput.trim();

    // Extract the time part (e.g., "5:54" from "up 5:54")
    const match = cleanOutput.match(/up\s+([^,]+)/);
    if (!match) {
        return "Unknown";
    }

    const timePart = match[1].trim();

    // If it's in format "X:YY" (hours:minutes)
    const timeMatch = timePart.match(/^(\d+):(\d+)$/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            if (remainingHours > 0) {
                return `${days} days, ${remainingHours} hours`;
            } else {
                return `${days} days`;
            }
        } else if (hours > 0) {
            return `${hours} hours, ${minutes} minutes`;
        } else {
            return `${minutes} minutes`;
        }
    }

    // If it's already in a readable format, return as is
    return timePart;
}

// Helper function to get system path for Docker
export function getSystemPath(originalPath: string): string {
    if (isDocker) {
        switch (originalPath) {
            case "/etc/os-release":
                return "/host/etc/os-release";
            case "/proc/stat":
                return "/host/proc/stat";
            default:
                return originalPath;
        }
    }
    return originalPath;
}

// Docker-specific crontab reading
export async function readCronFilesDocker(): Promise<string> {
    try {
        const crontabDir = "/host/cron/crontabs";
        console.log("Docker mode: Reading crontab from", crontabDir);
        const files = await fs.readdir(crontabDir);
        console.log("Found crontab files:", files);

        let allCronContent = "";

        for (const file of files) {
            if (file === "." || file === "..") continue;

            try {
                const filePath = path.join(crontabDir, file);

                // Try to read with sudo or change permissions temporarily
                let content = "";
                try {
                    content = await fs.readFile(filePath, "utf-8");
                } catch (permError) {
                    // If permission denied, try to change permissions temporarily
                    try {
                        await execAsync(`chmod 644 ${filePath}`);
                        content = await fs.readFile(filePath, "utf-8");
                        // Restore original permissions
                        await execAsync(`chmod 600 ${filePath}`);
                    } catch (chmodError) {
                        console.error(`Could not read crontab for user ${file}:`, chmodError);
                        continue;
                    }
                }

                // Add user identifier comment
                allCronContent += `# User: ${file}\n`;
                allCronContent += content;
                allCronContent += "\n\n";
                console.log(`Successfully read crontab for user ${file}:`, content.substring(0, 100) + "...");
            } catch (fileError) {
                console.error(`Error reading crontab for user ${file}:`, fileError);
            }
        }

        // Also read system crontab
        try {
            const systemCrontab = await fs.readFile("/host/crontab", "utf-8");
            allCronContent += "# System Crontab\n";
            allCronContent += systemCrontab;
            allCronContent += "\n\n";
        } catch (systemError) {
            console.error("Error reading system crontab:", systemError);
        }

        return allCronContent.trim();
    } catch (error) {
        console.error("Error reading host crontab files:", error);
        // Fallback to container's crontab command
        try {
            const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
            return stdout;
        } catch (fallbackError) {
            console.error("Fallback crontab command also failed:", fallbackError);
            return "";
        }
    }
}

// Docker-specific crontab writing
export async function writeCronFilesDocker(content: string): Promise<boolean> {
    try {
        // Parse the content to separate different users
        const lines = content.split("\n");
        const userCrontabs: { [key: string]: string[] } = {};
        let currentUser = "";
        let currentContent: string[] = [];

        for (const line of lines) {
            if (line.startsWith("# User: ")) {
                // Save previous user's content
                if (currentUser && currentContent.length > 0) {
                    userCrontabs[currentUser] = [...currentContent];
                }
                // Start new user
                currentUser = line.substring(8).trim();
                currentContent = [];
            } else if (line.startsWith("# System Crontab")) {
                // Save previous user's content
                if (currentUser && currentContent.length > 0) {
                    userCrontabs[currentUser] = [...currentContent];
                }
                // Handle system crontab separately
                currentUser = "system";
                currentContent = [];
            } else if (currentUser && line.trim() && !line.startsWith("#")) {
                // This is a cron job line
                currentContent.push(line);
            }
        }

        // Save last user's content
        if (currentUser && currentContent.length > 0) {
            userCrontabs[currentUser] = [...currentContent];
        }

        // Write each user's crontab
        for (const [username, cronJobs] of Object.entries(userCrontabs)) {
            if (username === "system") {
                // Write to system crontab
                const systemContent = cronJobs.join("\n") + "\n";
                await fs.writeFile("/host/crontab", systemContent);
            } else {
                // Write to user crontab
                const userCrontabPath = `/host/cron/crontabs/${username}`;
                const userContent = cronJobs.join("\n") + "\n";
                await fs.writeFile(userCrontabPath, userContent);
                // Set proper permissions
                await execAsync(`chmod 600 ${userCrontabPath}`);
                await execAsync(`chown ${username}:crontab ${userCrontabPath}`);
            }
        }

        return true;
    } catch (error) {
        console.error("Error writing cron files:", error);
        return false;
    }
}

// Docker-specific memory info
export async function getMemoryInfoDocker() {
    try {
        const meminfo = await fs.readFile("/host/proc/meminfo", "utf-8");
        const lines = meminfo.split("\n");

        let total = 0;
        let available = 0;

        for (const line of lines) {
            if (line.startsWith("MemTotal:")) {
                total = parseInt(line.split(/\s+/)[1]) * 1024; // Convert KB to bytes
            } else if (line.startsWith("MemAvailable:")) {
                available = parseInt(line.split(/\s+/)[1]) * 1024; // Convert KB to bytes
            }
        }

        if (total === 0) {
            throw new Error("Could not read memory info from /proc/meminfo");
        }

        const actualUsed = total - available;
        const usage = (actualUsed / total) * 100;

        const formatBytes = (bytes: number) => {
            const sizes = ["B", "KB", "MB", "GB", "TB"];
            if (bytes === 0) return "0 B";
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
        };

        let status = "Optimal";
        if (usage > 90) status = "Critical";
        else if (usage > 80) status = "High";
        else if (usage > 70) status = "Moderate";

        return {
            total: formatBytes(total),
            used: formatBytes(actualUsed),
            free: formatBytes(available),
            usage: Math.round(usage),
            status,
        };
    } catch (error) {
        console.error("Error reading host memory info:", error);
        throw error; // Let the main function handle fallback
    }
}

// Docker-specific CPU info
export async function getCPUInfoDocker() {
    try {
        // Read CPU info from host's /proc/cpuinfo
        const cpuinfo = await fs.readFile("/host/proc/cpuinfo", "utf-8");
        const lines = cpuinfo.split("\n");

        let model = "Unknown";
        for (const line of lines) {
            if (line.startsWith("model name")) {
                model = line.split(":")[1]?.trim() || "Unknown";
                break;
            }
        }

        // Count CPU cores from cpuinfo
        const cores = lines.filter(line => line.startsWith("processor")).length;

        return { model, cores };
    } catch (error) {
        console.error("Error reading host CPU info:", error);
        throw error; // Let the main function handle fallback
    }
}

// Docker-specific GPU info
export async function getGPUInfoDocker() {
    console.log("getGPUInfo called");
    try {
        // Try to get GPU info from host's PCI information
        let gpuInfo = "Unknown GPU";

        try {
            // Try to read from host's sysfs first
            const { stdout } = await execAsync("find /host/sys/devices -name 'card*' -type d | head -1");
            if (stdout.trim()) {
                const cardPath = stdout.trim();
                const { stdout: nameOutput } = await execAsync(`cat ${cardPath}/name 2>/dev/null || echo "Unknown GPU"`);
                gpuInfo = nameOutput.trim();
                console.log("Found GPU via sysfs:", gpuInfo);
            }
        } catch (sysfsError) {
            console.log("Could not read GPU info from host sysfs:", sysfsError);
            // Fallback: try to read from /proc/bus/pci/devices
            try {
                const pciInfo = await fs.readFile("/host/proc/bus/pci/devices", "utf-8");
                const lines = pciInfo.split("\n");
                for (const line of lines) {
                    if (line.includes("0300")) { // VGA controller class
                        const parts = line.split(/\s+/);
                        if (parts.length > 1) {
                            gpuInfo = `PCI Device ${parts[0]}`;
                            console.log("Found GPU via PCI devices:", gpuInfo);
                            break;
                        }
                    }
                }
            } catch (pciError) {
                console.log("Could not read GPU info from PCI devices:", pciError);
            }
        }

        if (gpuInfo === "Unknown GPU") {
            return {
                model: "No dedicated GPU detected",
                status: "Integrated",
            };
        }

        return {
            model: gpuInfo,
            status: "Available",
        };
    } catch (error) {
        return {
            model: "Unknown",
            status: "Unknown",
        };
    }
}

// Docker-specific network info
export async function getNetworkInfoDocker() {
    console.log("getNetworkInfo called");
    try {
        let pingOutput = "";
        let latency = 0;

        try {
            const { stdout } = await execAsync(
                'ping -c 1 -W 1 8.8.8.8 2>/dev/null || echo "timeout"'
            );
            pingOutput = stdout;
        } catch (pingError) {
            console.log("Ping command failed, trying curl instead");
            // Try using curl instead of ping
            try {
                const startTime = Date.now();
                const { stdout } = await execAsync(
                    'curl -s --connect-timeout 1 --max-time 2 https://www.google.com > /dev/null && echo "success" || echo "timeout"'
                );
                const endTime = Date.now();
                latency = endTime - startTime;
                pingOutput = stdout;
            } catch (curlError) {
                console.log("Both ping and curl failed");
                pingOutput = "timeout";
            }
        }

        if (
            pingOutput.includes("timeout") ||
            pingOutput.includes("100% packet loss") ||
            pingOutput.includes("No connection")
        ) {
            return {
                speed: "No connection",
                latency: 0,
                downloadSpeed: 0,
                uploadSpeed: 0,
                status: "Offline",
            };
        }

        // If we used curl, latency is already calculated
        if (latency === 0) {
            const lines = pingOutput.split("\n");
            const timeLine = lines.find((line) => line.includes("time="));

            if (timeLine) {
                const match = timeLine.match(/time=(\d+\.?\d*)/);
                if (match) {
                    latency = parseFloat(match[1]);
                }
            }
        }

        let downloadSpeed = 0;
        let speed = "Unknown";
        let status = "Stable";

        if (latency < 10) {
            downloadSpeed = 50;
            speed = "Excellent";
            status = "Optimal";
        } else if (latency < 30) {
            downloadSpeed = 25;
            speed = "Good";
            status = "Stable";
        } else if (latency < 100) {
            downloadSpeed = 10;
            speed = "Fair";
            status = "Slow";
        } else {
            downloadSpeed = 2;
            speed = "Poor";
            status = "Poor";
        }

        return {
            speed,
            latency: Math.round(latency),
            downloadSpeed: Math.round(downloadSpeed * 100) / 100,
            uploadSpeed: 0,
            status,
        };
    } catch (error) {
        return {
            speed: "Unknown",
            latency: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            status: "Unknown",
        };
    }
}

export { isDocker };
