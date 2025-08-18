import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";

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
    status: string;
  };
  systemStatus: {
    overall: string;
    details: string;
  };
}

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  comment?: string;
  enabled: boolean;
}

// Get actual OS information
async function getOSInfo(): Promise<string> {
  try {
    // Try to read /etc/os-release for detailed OS info
    const osRelease = readFileSync("/etc/os-release", "utf8");
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

    // Fallback to uname
    const { stdout } = await execAsync("uname -a");
    return stdout.trim();
  } catch (error) {
    // Final fallback
    const { stdout } = await execAsync("uname -s -r");
    return stdout.trim();
  }
}

// Get real memory usage
async function getMemoryInfo() {
  try {
    const { stdout } = await execAsync("free -b");
    const lines = stdout.split("\n");
    const memLine = lines[1].split(/\s+/);

    const total = parseInt(memLine[1]);
    const used = parseInt(memLine[2]);
    const free = parseInt(memLine[3]);
    const usage = (used / total) * 100;

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
      used: formatBytes(used),
      free: formatBytes(free),
      usage: Math.round(usage),
      status,
    };
  } catch (error) {
    return {
      total: "Unknown",
      used: "Unknown",
      free: "Unknown",
      usage: 0,
      status: "Unknown",
    };
  }
}

// Get real CPU information and usage
async function getCPUInfo() {
  try {
    // Get CPU model
    const { stdout: modelOutput } = await execAsync(
      "lscpu | grep 'Model name' | cut -f 2 -d ':'"
    );
    const model = modelOutput.trim();

    // Get CPU cores
    const { stdout: coresOutput } = await execAsync("nproc");
    const cores = parseInt(coresOutput.trim());

    // Get CPU usage by reading /proc/stat
    const stat1 = readFileSync("/proc/stat", "utf8").split("\n")[0];
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
    const stat2 = readFileSync("/proc/stat", "utf8").split("\n")[0];

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

// Get GPU information
async function getGPUInfo() {
  try {
    // Try to get GPU info using lspci
    const { stdout } = await execAsync("lspci | grep -i vga");
    const gpuLines = stdout.split("\n").filter((line) => line.trim());

    if (gpuLines.length > 0) {
      const gpuInfo = gpuLines[0].split(":")[2]?.trim() || "Unknown GPU";

      // Try to get memory info for NVIDIA GPUs
      let memory = "";
      try {
        const { stdout: nvidiaOutput } = await execAsync(
          "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null"
        );
        if (nvidiaOutput.trim()) {
          const memMB = parseInt(nvidiaOutput.trim());
          memory = `${Math.round(memMB / 1024)} GB`;
        }
      } catch (e) {
        // NVIDIA-SMI not available
      }

      return {
        model: gpuInfo,
        memory,
        status: "Available",
      };
    }

    return {
      model: "No dedicated GPU detected",
      status: "Integrated",
    };
  } catch (error) {
    return {
      model: "Unknown",
      status: "Unknown",
    };
  }
}

// Perform network speed test
async function getNetworkInfo() {
  try {
    // Simple network test using ping to 8.8.8.8
    const startTime = Date.now();
    const { stdout } = await execAsync(
      'ping -c 3 -W 1 8.8.8.8 2>/dev/null || echo "timeout"'
    );
    const endTime = Date.now();

    if (stdout.includes("timeout") || stdout.includes("100% packet loss")) {
      return {
        speed: "No connection",
        latency: 0,
        status: "Offline",
      };
    }

    // Parse ping results
    const lines = stdout.split("\n");
    const timeLine = lines.find((line) => line.includes("time="));
    let latency = 0;

    if (timeLine) {
      const match = timeLine.match(/time=(\d+\.?\d*)/);
      if (match) {
        latency = parseFloat(match[1]);
      }
    }

    // Determine speed based on latency
    let speed = "Unknown";
    let status = "Stable";

    if (latency < 10) {
      speed = "Excellent";
      status = "Optimal";
    } else if (latency < 50) {
      speed = "Good";
      status = "Stable";
    } else if (latency < 100) {
      speed = "Fair";
      status = "Slow";
    } else {
      speed = "Poor";
      status = "Poor";
    }

    return {
      speed,
      latency: Math.round(latency),
      status,
    };
  } catch (error) {
    return {
      speed: "Unknown",
      latency: 0,
      status: "Unknown",
    };
  }
}

// Determine overall system status
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
      hostnameOutput,
      ipOutput,
      uptimeOutput,
      platform,
      memory,
      cpu,
      gpu,
      network,
    ] = await Promise.all([
      execAsync("hostname"),
      execAsync("hostname -I | awk '{print $1}'"),
      execAsync("uptime -p"),
      getOSInfo(),
      getMemoryInfo(),
      getCPUInfo(),
      getGPUInfo(),
      getNetworkInfo(),
    ]);

    const systemStatus = getSystemStatus(memory, cpu, network);

    return {
      platform,
      hostname: hostnameOutput.stdout.trim(),
      ip: ipOutput.stdout.trim() || "Unknown",
      uptime: uptimeOutput.stdout.trim(),
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
      network: { speed: "Unknown", latency: 0, status: "Unknown" },
      systemStatus: {
        overall: "Unknown",
        details: "Unable to retrieve system information",
      },
    };
  }
}

export async function getCronJobs(): Promise<CronJob[]> {
  const jobs: CronJob[] = [];

  try {
    const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
    const lines = stdout.split("\n");
    let currentComment = "";
    let jobIndex = 0;

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return;

      if (trimmedLine.startsWith("#")) {
        currentComment = trimmedLine.substring(1).trim();
        return;
      }

      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 6) {
        const schedule = parts.slice(0, 5).join(" ");
        const command = parts.slice(5).join(" ");

        jobs.push({
          id: `unix-${jobIndex}`,
          schedule,
          command,
          comment: currentComment,
          enabled: true,
        });

        currentComment = "";
        jobIndex++;
      }
    });
  } catch (error) {
    console.error("Error getting cron jobs:", error);
  }

  return jobs;
}

export async function addCronJob(
  schedule: string,
  command: string,
  comment: string = ""
): Promise<boolean> {
  try {
    const { stdout: currentCron } = await execAsync(
      'crontab -l 2>/dev/null || echo ""'
    );
    const newEntry = comment
      ? `# ${comment}\n${schedule} ${command}`
      : `${schedule} ${command}`;
    const newCron = currentCron + "\n" + newEntry;

    await execAsync('echo "' + newCron + '" | crontab -');
    return true;
  } catch (error) {
    console.error("Error adding cron job:", error);
    return false;
  }
}

export async function deleteCronJob(id: string): Promise<boolean> {
  try {
    const { stdout: currentCron } = await execAsync(
      'crontab -l 2>/dev/null || echo ""'
    );
    const lines = currentCron.split("\n");
    let currentComment = "";
    let cronEntries: string[] = [];
    let jobIndex = 0;
    let targetJobIndex = parseInt(id.replace("unix-", ""));

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return;

      if (trimmedLine.startsWith("#")) {
        currentComment = trimmedLine;
      } else {
        if (jobIndex !== targetJobIndex) {
          const entryWithComment = currentComment
            ? `${currentComment}\n${trimmedLine}`
            : trimmedLine;
          cronEntries.push(entryWithComment);
        }
        jobIndex++;
        currentComment = "";
      }
    });

    const newCron = cronEntries.join("\n") + "\n";
    await execAsync('echo "' + newCron + '" | crontab -');
    return true;
  } catch (error) {
    console.error("Error deleting cron job:", error);
  }

  return false;
}

export async function updateCronJob(
  id: string,
  schedule: string,
  command: string,
  comment: string = ""
): Promise<boolean> {
  try {
    const { stdout: currentCron } = await execAsync(
      'crontab -l 2>/dev/null || echo ""'
    );
    const lines = currentCron.split("\n");
    let currentComment = "";
    let cronEntries: string[] = [];
    let jobIndex = 0;
    let targetJobIndex = parseInt(id.replace("unix-", ""));

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return;

      if (trimmedLine.startsWith("#")) {
        currentComment = trimmedLine;
      } else {
        if (jobIndex === targetJobIndex) {
          const newEntry = comment
            ? `# ${comment}\n${schedule} ${command}`
            : `${schedule} ${command}`;
          cronEntries.push(newEntry);
        } else {
          const entryWithComment = currentComment
            ? `${currentComment}\n${trimmedLine}`
            : trimmedLine;
          cronEntries.push(entryWithComment);
        }
        jobIndex++;
        currentComment = "";
      }
    });

    const newCron = cronEntries.join("\n") + "\n";
    await execAsync('echo "' + newCron + '" | crontab -');
    return true;
  } catch (error) {
    console.error("Error updating cron job:", error);
  }

  return false;
}
