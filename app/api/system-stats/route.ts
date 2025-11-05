import { NextRequest, NextResponse } from 'next/server';
import * as si from 'systeminformation';

export const dynamic = 'force-dynamic';

import { getTranslations } from 'next-intl/server';

export async function GET(request: NextRequest) {
    try {
        const t = await getTranslations();
        const [
            memInfo,
            cpuInfo,
            diskInfo,
            loadInfo,
            uptimeInfo,
            networkInfo
        ] = await Promise.all([
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

        const actualUsed = memInfo.active || memInfo.used;
        const actualFree = memInfo.available || memInfo.free;
        const memUsage = ((actualUsed / memInfo.total) * 100);
        let memStatus = t("system.optimal");
        if (memUsage > 90) memStatus = t("system.critical");
        else if (memUsage > 80) memStatus = t("system.high");
        else if (memUsage > 70) memStatus = t("system.moderate");

        const rootDisk = diskInfo.find(disk => disk.mount === '/') || diskInfo[0];
        const diskUsage = rootDisk ? ((rootDisk.used / rootDisk.size) * 100) : 0;
        let diskStatus = t("system.optimal");
        if (diskUsage > 90) diskStatus = t("system.critical");
        else if (diskUsage > 80) diskStatus = t("system.high");
        else if (diskUsage > 70) diskStatus = t("system.moderate");

        const cpuStatus = loadInfo.currentLoad > 80 ? t("system.high") :
            loadInfo.currentLoad > 60 ? t("system.moderate") : t("system.optimal");

        const criticalThreshold = 90;
        const warningThreshold = 80;
        let overallStatus = t("system.optimal");
        let statusDetails = t("system.allSystemsRunningNormally");

        if (memUsage > criticalThreshold || loadInfo.currentLoad > criticalThreshold || diskUsage > criticalThreshold) {
            overallStatus = t("system.critical");
            statusDetails = t("system.highResourceUsageDetectedImmediateAttentionRequired");
        } else if (memUsage > warningThreshold || loadInfo.currentLoad > warningThreshold || diskUsage > warningThreshold) {
            overallStatus = t("system.warning");
            statusDetails = t("system.moderateResourceUsageMonitoringRecommended");
        }

        let mainInterface: any = null;
        if (Array.isArray(networkInfo) && networkInfo.length > 0) {
            mainInterface = networkInfo.find(net =>
                net.iface && !net.iface.includes('lo') && net.operstate === 'up'
            ) || networkInfo.find(net =>
                net.iface && !net.iface.includes('lo')
            ) || networkInfo[0];
        }

        const networkSpeed = mainInterface && 'rx_sec' in mainInterface && 'tx_sec' in mainInterface
            ? `${Math.round(((mainInterface.rx_sec || 0) + (mainInterface.tx_sec || 0)) / 1024 / 1024)} Mbps`
            : t("system.unknown");

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
                total: rootDisk ? formatBytes(rootDisk.size) : t("system.unknown"),
                used: rootDisk ? formatBytes(rootDisk.used) : t("system.unknown"),
                free: rootDisk ? formatBytes(rootDisk.available) : t("system.unknown"),
                usage: Math.round(diskUsage),
                status: diskStatus,
            },
            network: {
                speed: networkSpeed,
                latency: latency,
                downloadSpeed: mainInterface && 'rx_sec' in mainInterface ? Math.round((mainInterface.rx_sec || 0) / 1024 / 1024) : 0,
                uploadSpeed: mainInterface && 'tx_sec' in mainInterface ? Math.round((mainInterface.tx_sec || 0) / 1024 / 1024) : 0,
                status: mainInterface && 'operstate' in mainInterface && mainInterface.operstate === 'up' ? t("system.connected") : t("system.unknown"),
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
                    model: gpu.model || t("system.unknownGPU"),
                    memory: gpu.vram ? `${gpu.vram} MB` : undefined,
                    status: t("system.available"),
                };
            } else {
                systemStats.gpu = {
                    model: t("system.noGPUDetected"),
                    status: t("system.unknown"),
                };
            }
        } catch (error) {
            systemStats.gpu = {
                model: t("system.gpuDetectionFailed"),
                status: t("system.unknown"),
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