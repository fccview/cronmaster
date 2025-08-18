import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const isDocker = process.env.DOCKER === "true";

// Helper function to get host information when in Docker
async function getHostInfo(): Promise<{ hostname: string; ip: string; uptime: string }> {
  if (isDocker) {
    try {
      // Read hostname from host's /etc/hostname
      const hostname = await fs.readFile("/host/etc/hostname", "utf-8");

      // Read IP from host's network interfaces
      const { stdout: ipOutput } = await execAsync("ip route get 1.1.1.1 | awk '{print $7}' | head -1");

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
function formatUptime(seconds: number): string {
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
function parseUptimeOutput(uptimeOutput: string): string {
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

  // In Docker, read directly from user crontab files
  try {
    const crontabDir = "/host/cron/crontabs";
    const files = await fs.readdir(crontabDir);

    let allCronContent = "";

    for (const file of files) {
      if (file === "." || file === "..") continue;

      try {
        const filePath = path.join(crontabDir, file);
        const content = await fs.readFile(filePath, "utf-8");

        // Add user identifier comment
        allCronContent += `# User: ${file}\n`;
        allCronContent += content;
        allCronContent += "\n\n";
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

  // In Docker, write directly to user crontab files
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
    // In Docker, read from host's memory information
    const memPath = isDocker ? "/host/proc/meminfo" : null;

    if (isDocker && memPath) {
      try {
        const meminfo = await fs.readFile(memPath, "utf-8");
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
        // Fallback to container's free command
      }
    }

    // Use container's free command (fallback or non-Docker mode)
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
        // Read CPU info from host's /proc/cpuinfo
        const cpuinfo = await fs.readFile("/host/proc/cpuinfo", "utf-8");
        const lines = cpuinfo.split("\n");

        for (const line of lines) {
          if (line.startsWith("model name")) {
            model = line.split(":")[1]?.trim() || "Unknown";
            break;
          }
        }

        // Count CPU cores from cpuinfo
        cores = lines.filter(line => line.startsWith("processor")).length;
      } catch (error) {
        console.error("Error reading host CPU info:", error);
        // Fallback to container commands
        const { stdout: modelOutput } = await execAsync(
          "lscpu | grep 'Model name' | cut -f 2 -d ':'"
        );
        model = modelOutput.trim();

        const { stdout: coresOutput } = await execAsync("nproc");
        cores = parseInt(coresOutput.trim());
      }
    } else {
      // Not in Docker, use normal commands
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
    // Try to get GPU info from host's PCI information
    let gpuInfo = "Unknown GPU";

    if (isDocker) {
      try {
        // Try to read from host's lspci if available
        const { stdout } = await execAsync("lspci | grep -i vga");
        const gpuLines = stdout.split("\n").filter((line) => line.trim());
        if (gpuLines.length > 0) {
          gpuInfo = gpuLines[0].split(":")[2]?.trim() || "Unknown GPU";
        }
      } catch (error) {
        // Fallback: try to read from host's sysfs
        try {
          const { stdout } = await execAsync("find /host/sys/devices -name 'card*' -type d | head -1");
          if (stdout.trim()) {
            const cardPath = stdout.trim();
            const { stdout: nameOutput } = await execAsync(`cat ${cardPath}/name 2>/dev/null || echo "Unknown GPU"`);
            gpuInfo = nameOutput.trim();
          }
        } catch (sysfsError) {
          console.error("Could not read GPU info from host:", sysfsError);
        }
      }
    } else {
      // Not in Docker, use normal lspci
      const { stdout } = await execAsync("lspci | grep -i vga");
      const gpuLines = stdout.split("\n").filter((line) => line.trim());
      if (gpuLines.length > 0) {
        gpuInfo = gpuLines[0].split(":")[2]?.trim() || "Unknown GPU";
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

    if (gpuInfo === "Unknown GPU") {
      return {
        model: "No dedicated GPU detected",
        status: "Integrated",
      };
    }

    return {
      model: gpuInfo,
      memory,
      status: "Available",
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

export async function getCronJobs(): Promise<CronJob[]> {
  const jobs: CronJob[] = [];

  try {
    const cronContent = await readCronFiles();
    const lines = cronContent.split("\n");
    let currentComment = "";
    let currentUser = "";
    let jobIndex = 0;

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return;

      if (trimmedLine.startsWith("# User: ")) {
        currentUser = trimmedLine.substring(8).trim();
        return;
      }

      if (trimmedLine.startsWith("# System Crontab")) {
        currentUser = "system";
        return;
      }

      if (trimmedLine.startsWith("#")) {
        // Skip user/system headers, but keep other comments
        if (!trimmedLine.startsWith("# User:") && !trimmedLine.startsWith("# System Crontab")) {
          currentComment = trimmedLine.substring(1).trim();
        }
        return;
      }

      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 6) {
        const schedule = parts.slice(0, 5).join(" ");
        const command = parts.slice(5).join(" ");

        // Add user info to comment if available
        let fullComment = currentComment;
        if (currentUser && currentUser !== "system") {
          fullComment = fullComment ? `${currentComment} (User: ${currentUser})` : `User: ${currentUser}`;
        } else if (currentUser === "system") {
          fullComment = fullComment ? `${currentComment} (System)` : "System";
        }

        jobs.push({
          id: `unix-${jobIndex}`,
          schedule,
          command,
          comment: fullComment,
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

    // In Docker mode, we need to determine which user to add the job to
    if (isDocker) {
      // For now, add to the first user found, or create a default user entry
      const lines = cronContent.split("\n");
      let hasUserSection = false;

      for (const line of lines) {
        if (line.startsWith("# User: ")) {
          hasUserSection = true;
          break;
        }
      }

      if (!hasUserSection) {
        // No user sections found, create a default one
        const newEntry = comment
          ? `# User: root\n# ${comment}\n${schedule} ${command}`
          : `# User: root\n${schedule} ${command}`;
        const newCron = cronContent + "\n" + newEntry;
        await writeCronFiles(newCron);
      } else {
        // Add to existing content
        const newEntry = comment
          ? `# ${comment}\n${schedule} ${command}`
          : `${schedule} ${command}`;
        const newCron = cronContent + "\n" + newEntry;
        await writeCronFiles(newCron);
      }
    } else {
      // Non-Docker mode, use original logic
      const newEntry = comment
        ? `# ${comment}\n${schedule} ${command}`
        : `${schedule} ${command}`;
      const newCron = cronContent + "\n" + newEntry;
      await writeCronFiles(newCron);
    }

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
