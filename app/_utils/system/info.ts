import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import { isDocker, getSystemPath, getMemoryInfoDocker, getCPUInfoDocker, getGPUInfoDocker, getNetworkInfoDocker, getHostInfo } from "./docker";

const execAsync = promisify(exec);

export interface SystemInfo {
    platform: string;
    hostname: string;
    ip: string;
    uptime: string;
    memory: {
        total: string;
        used: string;
        free: string;
        usage: number;
        status: string;
    };
    cpu: {
        model: string;
        cores: number;
        usage: number;
        status: string;
    };
    gpu: {
        model: string;
        memory?: string;
        status: string;
    };
    network: {
        speed: string;
        latency: number;
        downloadSpeed: number;
        uploadSpeed: number;
        status: string;
    };
    systemStatus: {
        overall: string;
        details: string;
    };
}

async function getOSInfo(): Promise<string> {
    try {
        const osReleasePath = getSystemPath("/etc/os-release");
        const osRelease = readFileSync(osReleasePath, "utf8");
        const lines = osRelease.split("\n");
        let name = "";
        let version = "";

        for (const line of lines) {
            if (line.startsWith("PRETTY_NAME=")) {
                return line.split("=")[1].replace(/"/g, "");
            }
            if (line.startsWith("NAME=") && !name) {
                name = line.split("=")[1].replace(/"/g, "");
            }
            if (line.startsWith("VERSION=") && !version) {
                version = line.split("=")[1].replace(/"/g, "");
            }
        }

        if (name && version) {
            return `${name} ${version}`;
        }

        const { stdout } = await execAsync("uname -a");
        return stdout.trim();
    } catch (error) {
        const { stdout } = await execAsync("uname -s -r");
        return stdout.trim();
    }
}

async function getMemoryInfo() {
    try {
        const memPath = isDocker ? "/host/proc/meminfo" : null;

        if (isDocker && memPath) {
            try {
                return await getMemoryInfoDocker();
            } catch (error) {
                console.error("Error reading host memory info:", error);
            }
        }

        const { stdout } = await execAsync("free -b");
        const lines = stdout.split("\n");

        const memLine = lines.find((line) => line.trim().startsWith("Mem:"));
        if (!memLine) {
            throw new Error("Could not find memory line in free output");
        }

        const parts = memLine.trim().split(/\s+/);

        const total = parseInt(parts[1]);
        const available = parseInt(parts[6]);

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
        console.error("Error parsing memory info:", error);
        return {
            total: "Unknown",
            used: "Unknown",
            free: "Unknown",
            usage: 0,
            status: "Unknown",
        };
    }
}

async function getCPUInfo() {
    try {
        let model = "Unknown";
        let cores = 0;

        if (isDocker) {
            try {
                const cpuInfo = await getCPUInfoDocker();
                model = cpuInfo.model;
                cores = cpuInfo.cores;
            } catch (error) {
                console.error("Error reading host CPU info:", error);
                const { stdout: modelOutput } = await execAsync(
                    "lscpu | grep 'Model name' | cut -f 2 -d ':'"
                );
                model = modelOutput.trim();

                const { stdout: coresOutput } = await execAsync("nproc");
                cores = parseInt(coresOutput.trim());
            }
        } else {
            const { stdout: modelOutput } = await execAsync(
                "lscpu | grep 'Model name' | cut -f 2 -d ':'"
            );
            model = modelOutput.trim();

            const { stdout: coresOutput } = await execAsync("nproc");
            cores = parseInt(coresOutput.trim());
        }

        const statPath = getSystemPath("/proc/stat");
        const stat1 = readFileSync(statPath, "utf8").split("\n")[0];
        await new Promise((resolve) => setTimeout(resolve, 50));
        const stat2 = readFileSync(statPath, "utf8").split("\n")[0];

        const parseCPU = (line: string) => {
            const parts = line.split(/\s+/);
            return {
                user: parseInt(parts[1]),
                nice: parseInt(parts[2]),
                system: parseInt(parts[3]),
                idle: parseInt(parts[4]),
                iowait: parseInt(parts[5]),
                irq: parseInt(parts[6]),
                softirq: parseInt(parts[7]),
                steal: parseInt(parts[8]),
            };
        };

        const cpu1 = parseCPU(stat1);
        const cpu2 = parseCPU(stat2);

        const total1 = Object.values(cpu1).reduce((a, b) => a + b, 0);
        const total2 = Object.values(cpu2).reduce((a, b) => a + b, 0);
        const idle1 = cpu1.idle + cpu1.iowait;
        const idle2 = cpu2.idle + cpu2.iowait;

        const totalDiff = total2 - total1;
        const idleDiff = idle2 - idle1;
        const usage = ((totalDiff - idleDiff) / totalDiff) * 100;

        let status = "Optimal";
        if (usage > 90) status = "Critical";
        else if (usage > 80) status = "High";
        else if (usage > 70) status = "Moderate";

        return {
            model,
            cores,
            usage: Math.round(usage),
            status,
        };
    } catch (error) {
        return {
            model: "Unknown",
            cores: 0,
            usage: 0,
            status: "Unknown",
        };
    }
}

async function getGPUInfo() {
    try {
        if (isDocker) {
            return await getGPUInfoDocker();
        } else {
            try {
                const { stdout } = await execAsync("lspci | grep -i vga");
                const gpuLines = stdout.split("\n").filter((line) => line.trim());
                if (gpuLines.length > 0) {
                    const gpuInfo = gpuLines[0].split(":")[2]?.trim() || "Unknown GPU";
                    return {
                        model: gpuInfo,
                        status: "Available",
                    };
                }
            } catch (error) {
                console.log("lspci not available, using fallback methods");
            }
        }

        let memory = "";
        try {
            const { stdout: nvidiaOutput } = await execAsync(
                "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null"
            );
            if (nvidiaOutput.trim()) {
                const memMB = parseInt(nvidiaOutput.trim());
                memory = `${Math.round(memMB / 1024)} GB`;
            }
        } catch (e) { }

        if (isDocker) {
            return {
                model: "No dedicated GPU detected",
                status: "Integrated",
            };
        }

        return {
            model: "Unknown GPU",
            memory,
            status: "Unknown",
        };
    } catch (error) {
        return {
            model: "Unknown",
            status: "Unknown",
        };
    }
}

async function getNetworkInfo() {
    try {
        if (isDocker) {
            return await getNetworkInfoDocker();
        } else {
            const { stdout: pingOutput } = await execAsync(
                'ping -c 1 -W 1 8.8.8.8 2>/dev/null || echo "timeout"'
            );

            if (
                pingOutput.includes("timeout") ||
                pingOutput.includes("100% packet loss")
            ) {
                return {
                    speed: "No connection",
                    latency: 0,
                    downloadSpeed: 0,
                    uploadSpeed: 0,
                    status: "Offline",
                };
            }

            const lines = pingOutput.split("\n");
            const timeLine = lines.find((line) => line.includes("time="));
            let latency = 0;

            if (timeLine) {
                const match = timeLine.match(/time=(\d+\.?\d*)/);
                if (match) {
                    latency = parseFloat(match[1]);
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
        }
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

function getSystemStatus(memory: any, cpu: any, network: any) {
    const statuses = [memory.status, cpu.status, network.status];
    const criticalCount = statuses.filter((s) => s === "Critical").length;
    const highCount = statuses.filter((s) => s === "High").length;

    let overall = "Operational";
    let details = "All systems running smoothly";

    if (criticalCount > 0) {
        overall = "Critical";
        details = "System performance issues detected";
    } else if (highCount > 0) {
        overall = "Warning";
        details = "Some systems showing high usage";
    } else if (statuses.some((s) => s === "Moderate")) {
        overall = "Stable";
        details = "System performance is stable";
    }

    return { overall, details };
}

export async function getSystemInfo(): Promise<SystemInfo> {
    try {
        const [
            hostInfo,
            platform,
            memory,
            cpu,
            gpu,
            network,
        ] = await Promise.all([
            getHostInfo(),
            getOSInfo(),
            getMemoryInfo(),
            getCPUInfo(),
            getGPUInfo(),
            getNetworkInfo(),
        ]);

        const systemStatus = getSystemStatus(memory, cpu, network);

        return {
            platform,
            hostname: hostInfo.hostname,
            ip: hostInfo.ip || "Unknown",
            uptime: hostInfo.uptime,
            memory,
            cpu,
            gpu,
            network,
            systemStatus,
        };
    } catch (error) {
        console.error("Error getting system info:", error);
        return {
            platform: "Unknown",
            hostname: "Unknown",
            ip: "Unknown",
            uptime: "Unknown",
            memory: {
                total: "Unknown",
                used: "Unknown",
                free: "Unknown",
                usage: 0,
                status: "Unknown",
            },
            cpu: { model: "Unknown", cores: 0, usage: 0, status: "Unknown" },
            gpu: { model: "Unknown", status: "Unknown" },
            network: {
                speed: "Unknown",
                latency: 0,
                downloadSpeed: 0,
                uploadSpeed: 0,
                status: "Unknown",
            },
            systemStatus: {
                overall: "Unknown",
                details: "Unable to retrieve system information",
            },
        };
    }
}
