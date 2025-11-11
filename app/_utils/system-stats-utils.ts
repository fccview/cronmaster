import { exec } from "child_process";
import { promisify } from "util";
import * as si from "systeminformation";

const execAsync = promisify(exec);

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${["B", "KB", "MB", "GB", "TB"][i]}`;
};

export const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days} days, ${hours} hours`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes`;
    return `${minutes} minutes`;
};

export async function getPing(): Promise<number> {
    try {
        const { stdout } = await execAsync(
            'ping -c 1 -W 1000 8.8.8.8 2>/dev/null || echo "timeout"'
        );
        const match = stdout.match(/time=(\d+\.?\d*)/);
        return match ? Math.round(parseFloat(match[1])) : 0;
    } catch (error) {
        return 0;
    }
}

export const getStatus = (
    value: number,
    thresholds: { critical?: number; high?: number; moderate?: number },
    t: (key: string) => string
): string => {
    if (thresholds.critical && value > thresholds.critical) return t("system.critical");
    if (thresholds.high && value > thresholds.high) return t("system.high");
    if (thresholds.moderate && value > thresholds.moderate) return t("system.moderate");
    return t("system.optimal");
};

export const findMainInterface = (
    networkInfo: si.Systeminformation.NetworkStatsData[]
) => {
    if (!Array.isArray(networkInfo) || networkInfo.length === 0) return null;
    return (
        networkInfo.find(
            (net) => net.iface && !net.iface.includes("lo") && net.operstate === "up"
        ) ||
        networkInfo.find((net) => net.iface && !net.iface.includes("lo")) ||
        networkInfo[0]
    );
};

export const formatGpuInfo = (
    graphics: si.Systeminformation.GraphicsData | null,
    t: (key: string) => string
) => {
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
        const gpu = graphics.controllers[0];
        return {
            model: gpu.model || t("system.unknownGPU"),
            memory: gpu.vram ? `${gpu.vram} MB` : undefined,
            status: t("system.available"),
        };
    }
    return {
        model: t(
            graphics ? "system.noGPUDetected" : "system.gpuDetectionFailed"
        ),
        status: t("system.unknown"),
    };
};

export const getOverallStatus = (
    memUsage: number,
    cpuLoad: number,
    t: (key: string) => string
) => {
    const criticalThreshold = 90;
    const warningThreshold = 80;

    if (memUsage > criticalThreshold || cpuLoad > criticalThreshold) {
        return {
            overall: t("system.critical"),
            details: t("system.highResourceUsageDetectedImmediateAttentionRequired"),
        };
    }
    if (memUsage > warningThreshold || cpuLoad > warningThreshold) {
        return {
            overall: t("system.warning"),
            details: t("system.moderateResourceUsageMonitoringRecommended"),
        };
    }
    return {
        overall: t("system.optimal"),
        details: t("system.allSystemsRunningNormally"),
    };
};  