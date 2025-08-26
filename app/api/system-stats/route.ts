import { NextRequest, NextResponse } from 'next/server';
import * as si from 'systeminformation';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const [
            osInfo,
            memInfo,
            cpuInfo,
            diskInfo,
            loadInfo,
            uptimeInfo,
            networkInfo
        ] = await Promise.all([
            si.osInfo(),
            si.mem(),
            si.cpu(),
            si.fsSize(),
            si.currentLoad(),
            si.time(),
            si.networkStats()
        ]);

        const formatBytes = (bytes: number) => {
            const sizes = ["B", "KB", "MB", "GB", "TB"];
            if (bytes === 0) return "0 B";
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
        };

        const formatUptime = (seconds: number): string => {
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
        };

        // Calculate memory usage properly - use active memory, not just used
        const actualUsed = memInfo.active || memInfo.used;
        const actualFree = memInfo.available || memInfo.free;
        const memUsage = ((actualUsed / memInfo.total) * 100);
        let memStatus = "Optimal";
        if (memUsage > 90) memStatus = "Critical";
        else if (memUsage > 80) memStatus = "High";
        else if (memUsage > 70) memStatus = "Moderate";

        const rootDisk = diskInfo.find(disk => disk.mount === '/') || diskInfo[0];
        const diskUsage = rootDisk ? ((rootDisk.used / rootDisk.size) * 100) : 0;
        let diskStatus = "Optimal";
        if (diskUsage > 90) diskStatus = "Critical";
        else if (diskUsage > 80) diskStatus = "High";
        else if (diskUsage > 70) diskStatus = "Moderate";

        const cpuStatus = loadInfo.currentLoad > 80 ? "High" :
            loadInfo.currentLoad > 60 ? "Moderate" : "Optimal";

        const criticalThreshold = 90;
        const warningThreshold = 80;
        let overallStatus = "Optimal";
        let statusDetails = "All systems running normally";

        if (memUsage > criticalThreshold || loadInfo.currentLoad > criticalThreshold || diskUsage > criticalThreshold) {
            overallStatus = "Critical";
            statusDetails = "High resource usage detected - immediate attention required";
        } else if (memUsage > warningThreshold || loadInfo.currentLoad > warningThreshold || diskUsage > warningThreshold) {
            overallStatus = "Warning";
            statusDetails = "Moderate resource usage - monitoring recommended";
        }

        let mainInterface = null;
        if (Array.isArray(networkInfo) && networkInfo.length > 0) {
            mainInterface = networkInfo.find(net =>
                net.iface && !net.iface.includes('lo') && net.operstate === 'up'
            ) || networkInfo.find(net =>
                net.iface && !net.iface.includes('lo')
            ) || networkInfo[0];
        }

        const networkSpeed = mainInterface && 'rx_sec' in mainInterface && 'tx_sec' in mainInterface
            ? `${Math.round(((mainInterface.rx_sec || 0) + (mainInterface.tx_sec || 0)) / 1024 / 1024)} Mbps`
            : "Unknown";

        // Get network latency via ping
        let latency = 0;
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            const { stdout } = await execAsync('ping -c 1 -W 1000 8.8.8.8 2>/dev/null || echo "timeout"');
            const match = stdout.match(/time=(\d+\.?\d*)/);
            if (match) {
                latency = Math.round(parseFloat(match[1]));
            }
        } catch (error) {
            latency = 0;
        }

        const systemStats: any = {
            uptime: formatUptime(uptimeInfo.uptime),
            memory: {
                total: formatBytes(memInfo.total),
                used: formatBytes(actualUsed),
                free: formatBytes(actualFree),
                usage: Math.round(memUsage),
                status: memStatus,
            },
            cpu: {
                model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
                cores: cpuInfo.cores,
                usage: Math.round(loadInfo.currentLoad),
                status: cpuStatus,
            },
            disk: {
                total: rootDisk ? formatBytes(rootDisk.size) : "Unknown",
                used: rootDisk ? formatBytes(rootDisk.used) : "Unknown",
                free: rootDisk ? formatBytes(rootDisk.available) : "Unknown",
                usage: Math.round(diskUsage),
                status: diskStatus,
            },
            network: {
                speed: networkSpeed,
                latency: latency,
                downloadSpeed: mainInterface && 'rx_sec' in mainInterface ? Math.round((mainInterface.rx_sec || 0) / 1024 / 1024) : 0,
                uploadSpeed: mainInterface && 'tx_sec' in mainInterface ? Math.round((mainInterface.tx_sec || 0) / 1024 / 1024) : 0,
                status: mainInterface && 'operstate' in mainInterface && mainInterface.operstate === 'up' ? "Connected" : "Unknown",
            },
            systemStatus: {
                overall: overallStatus,
                details: statusDetails,
            },
        };

        try {
            const graphics = await si.graphics();
            if (graphics.controllers && graphics.controllers.length > 0) {
                const gpu = graphics.controllers[0];
                systemStats.gpu = {
                    model: gpu.model || "Unknown GPU",
                    memory: gpu.vram ? `${gpu.vram} MB` : undefined,
                    status: "Available",
                };
            } else {
                systemStats.gpu = {
                    model: "No GPU detected",
                    status: "Unknown",
                };
            }
        } catch (error) {
            systemStats.gpu = {
                model: "GPU detection failed",
                status: "Unknown",
            };
        }

        return NextResponse.json(systemStats);
    } catch (error) {
        console.error('Error fetching system stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch system stats' },
            { status: 500 }
        );
    }
}