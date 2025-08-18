import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const isDocker = process.env.DOCKER === "true";

function getSystemPath(originalPath: string): string {
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

async function readCronFiles(): Promise<string> {
  if (!isDocker) {
    try {
      const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
      return stdout;
    } catch (error) {
      console.error("Error reading crontab:", error);
      return "";
    }
  }

  try {
    const crontabPath = "/host/crontab";
    const crontabsDir = "/host/cron/crontabs";

    let cronContent = "";

    try {
      const systemCrontab = await fs.readFile(crontabPath, "utf-8");
      cronContent += systemCrontab + "\n";
    } catch (error) {
      console.log("System crontab not found or not readable");
    }

    try {
      const files = await fs.readdir(crontabsDir);
      for (const file of files) {
        if (file !== "root") {
          try {
            const userCrontab = await fs.readFile(
              path.join(crontabsDir, file),
              "utf-8"
            );
            if (userCrontab.trim()) {
              cronContent += `# User: ${file}\n${userCrontab}\n`;
            }
          } catch (error) {
            console.log(`Could not read crontab for user ${file}`);
          }
        }
      }
    } catch (error) {
      console.log("User crontabs directory not found or not readable");
    }

    return cronContent || "";
  } catch (error) {
    console.error("Error reading cron files:", error);
    try {
      const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
      return stdout;
    } catch (fallbackError) {
      console.error("Fallback crontab command also failed:", fallbackError);
      return "";
    }
  }
}

async function writeCronFiles(content: string): Promise<boolean> {
  if (!isDocker) {
    try {
      await execAsync('echo "' + content + '" | crontab -');
      return true;
    } catch (error) {
      console.error("Error writing crontab:", error);
      return false;
    }
  }

  try {
    await execAsync('echo "' + content + '" | crontab -');
    return true;
  } catch (error) {
    console.error("Error writing cron files:", error);
    return false;
  }
}

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

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  comment?: string;
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
    const { stdout: modelOutput } = await execAsync(
      "lscpu | grep 'Model name' | cut -f 2 -d ':'"
    );
    const model = modelOutput.trim();

    const { stdout: coresOutput } = await execAsync("nproc");
    const cores = parseInt(coresOutput.trim());

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
    const { stdout } = await execAsync("lspci | grep -i vga");
    const gpuLines = stdout.split("\n").filter((line) => line.trim());

    if (gpuLines.length > 0) {
      const gpuInfo = gpuLines[0].split(":")[2]?.trim() || "Unknown GPU";

      let memory = "";
      try {
        const { stdout: nvidiaOutput } = await execAsync(
          "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null"
        );
        if (nvidiaOutput.trim()) {
          const memMB = parseInt(nvidiaOutput.trim());
          memory = `${Math.round(memMB / 1024)} GB`;
        }
      } catch (e) {}

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

async function getNetworkInfo() {
  try {
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

    const enableSpeedTest = false;
    if (enableSpeedTest) {
      try {
        const startTime = Date.now();
        const { stdout: curlOutput } = await execAsync(
          'curl -s -o /dev/null -w "%{speed_download}" https://speed.cloudflare.com/__down?bytes=1000000 2>/dev/null || echo "0"'
        );
        const endTime = Date.now();

        const speedBytesPerSec = parseFloat(curlOutput);
        if (speedBytesPerSec > 0) {
          downloadSpeed = speedBytesPerSec / (1024 * 1024);
        }
      } catch (e) {
        console.error("Error getting network info:", e);
      }
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
      execAsync("uptime | sed 's/.*up \\([^,]*\\).*/\\1/'"),
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

export async function getCronJobs(): Promise<CronJob[]> {
  const jobs: CronJob[] = [];

  try {
    const cronContent = await readCronFiles();
    const lines = cronContent.split("\n");
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
    const cronContent = await readCronFiles();
    const newEntry = comment
      ? `# ${comment}\n${schedule} ${command}`
      : `${schedule} ${command}`;
    const newCron = cronContent + "\n" + newEntry;

    await writeCronFiles(newCron);
    return true;
  } catch (error) {
    console.error("Error adding cron job:", error);
    return false;
  }
}

export async function deleteCronJob(id: string): Promise<boolean> {
  try {
    const cronContent = await readCronFiles();
    const lines = cronContent.split("\n");
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
    await writeCronFiles(newCron);
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
    const cronContent = await readCronFiles();
    const lines = cronContent.split("\n");
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
    await writeCronFiles(newCron);
    return true;
  } catch (error) {
    console.error("Error updating cron job:", error);
  }

  return false;
}
