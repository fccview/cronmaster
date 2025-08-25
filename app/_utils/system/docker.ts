import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const isDocker = process.env.DOCKER === "true";

export async function getHostInfo(): Promise<{ hostname: string; ip: string; uptime: string }> {
    if (isDocker) {
        try {
            const hostname = await fs.readFile("/host/etc/hostname", "utf-8");

            let ipOutput = "";
            try {
                const { stdout } = await execAsync("hostname -I | awk '{print $1}'");
                ipOutput = stdout;
            } catch (error) {
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

export function parseUptimeOutput(uptimeOutput: string): string {
    const cleanOutput = uptimeOutput.trim();

    const match = cleanOutput.match(/up\s+([^,]+)/);
    if (!match) {
        return "Unknown";
    }

    const timePart = match[1].trim();

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

    return timePart;
}

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





export async function getMemoryInfoDocker() {
    try {
        const meminfo = await fs.readFile("/host/proc/meminfo", "utf-8");
        const lines = meminfo.split("\n");

        let total = 0;
        let available = 0;

        for (const line of lines) {
            if (line.startsWith("MemTotal:")) {
                total = parseInt(line.split(/\s+/)[1]) * 1024;
            } else if (line.startsWith("MemAvailable:")) {
                available = parseInt(line.split(/\s+/)[1]) * 1024;
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
        throw error;
    }
}

export async function getCPUInfoDocker() {
    try {
        const cpuinfo = await fs.readFile("/host/proc/cpuinfo", "utf-8");
        const lines = cpuinfo.split("\n");

        let model = "Unknown";
        for (const line of lines) {
            if (line.startsWith("model name")) {
                model = line.split(":")[1]?.trim() || "Unknown";
                break;
            }
        }

        const cores = lines.filter(line => line.startsWith("processor")).length;

        return { model, cores };
    } catch (error) {
        console.error("Error reading host CPU info:", error);
        throw error;
    }
}

export async function getGPUInfoDocker() {
    try {
        let gpuInfo = "Unknown GPU";

        try {
            const { stdout } = await execAsync("lspci | grep -i vga");
            const gpuLines = stdout.split("\n").filter((line) => line.trim());
            if (gpuLines.length > 0) {
                gpuInfo = gpuLines[0].split(":")[2]?.trim() || "Unknown GPU";
            }
        } catch (lspciError) {
            try {
                const { stdout } = await execAsync("find /host/sys/devices -name 'card*' -type d | head -1");
                if (stdout.trim()) {
                    const cardPath = stdout.trim();
                    const { stdout: nameOutput } = await execAsync(`cat ${cardPath}/name 2>/dev/null || echo "Unknown GPU"`);
                    gpuInfo = nameOutput.trim();
                }
            } catch (sysfsError) {
                try {
                    const pciInfo = await fs.readFile("/host/proc/bus/pci/devices", "utf-8");
                    const lines = pciInfo.split("\n");
                    for (const line of lines) {
                        if (line.includes("0300")) {
                            const parts = line.split(/\s+/);
                            if (parts.length > 1) {
                                gpuInfo = `PCI Device ${parts[0]}`;
                                break;
                            }
                        }
                    }
                } catch (pciError) {
                    console.log("Could not read GPU info from PCI devices:", pciError);
                }
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

export async function getNetworkInfoDocker() {
    try {
        let latency = 0;
        let pingOutput = "";

        try {
            const { stdout } = await execAsync(
                'ping -c 1 -W 1 8.8.8.8 2>/dev/null || echo "timeout"'
            );
            pingOutput = stdout;

            const lines = pingOutput.split("\n");
            const timeLine = lines.find((line) => line.includes("time="));

            if (timeLine) {
                const match = timeLine.match(/time=(\d+\.?\d*)/);
                if (match) {
                    latency = parseFloat(match[1]);
                }
            }
        } catch (pingError) {
            console.log("Ping failed:", pingError);
            pingOutput = "timeout";
        }

        if (pingOutput.includes("timeout") || pingOutput.includes("100% packet loss")) {
            return {
                speed: "No connection",
                latency: 0,
                downloadSpeed: 0,
                uploadSpeed: 0,
                status: "Offline",
            };
        }

        if (latency > 0) {
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
        }

        return {
            speed: "Unknown",
            latency: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            status: "Unknown",
        };
    } catch (error) {
        console.error("Network error:", error);
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
