import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "@/app/_server/actions/translations";
import * as si from "systeminformation";
import {
  getPing,
  formatUptime,
  findMainInterface,
  getStatus,
  getOverallStatus,
  formatGpuInfo,
} from "@/app/_utils/system-stats-utils";
import { getDiskStats, formatDiskStats } from "@/app/_utils/disk-stats-utils";
import { formatBytes } from "@/app/_utils/format-utils";
import { sseBroadcaster } from "@/app/_utils/sse-broadcaster";
import { requireAuth } from "@/app/_utils/api-auth-utils";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("api:system");

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const authError = await requireAuth(request);
  if (authError) return authError;

  if (process.env.DISABLE_SYSTEM_STATS === "true") {
    return NextResponse.json(null);
  }

  try {
    const t = await getTranslations();

    const [
      [memInfo, cpuInfo, loadInfo, uptimeInfo, networkInfo],
      latency,
      graphics,
      diskStats,
    ] = await Promise.all([
      Promise.all([
        si.mem(),
        si.cpu(),
        si.currentLoad(),
        si.time(),
        si.networkStats(),
      ]),
      getPing(),
      si.graphics().catch(() => null),
      getDiskStats().catch(() => null),
    ]);

    const actualUsed = memInfo.active || memInfo.used;
    const memUsage = (actualUsed / memInfo.total) * 100;
    const cpuLoad = loadInfo.currentLoad;

    const mainInterface = findMainInterface(networkInfo);
    const rxSpeed = mainInterface
      ? (mainInterface.rx_sec || 0) / 1024 / 1024
      : 0;
    const txSpeed = mainInterface
      ? (mainInterface.tx_sec || 0) / 1024 / 1024
      : 0;

    const systemStats = {
      uptime: formatUptime(uptimeInfo.uptime),
      uptimeSeconds: uptimeInfo.uptime,
      memory: {
        total: formatBytes(memInfo.total),
        used: formatBytes(actualUsed),
        free: formatBytes(memInfo.available || memInfo.free),
        usage: Math.round(memUsage),
        status: getStatus(memUsage, { critical: 90, high: 80, moderate: 70 }),
      },
      cpu: {
        model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
        cores: cpuInfo.cores,
        usage: Math.round(cpuLoad),
        status: getStatus(cpuLoad, { high: 80, moderate: 60 }),
      },
      network: {
        speed:
          mainInterface &&
            mainInterface.rx_sec != null &&
            mainInterface.tx_sec != null
            ? `${Math.round(rxSpeed + txSpeed)} Mbps`
            : t("system.unknown"),
        latency: latency,
        downloadSpeed: Math.round(rxSpeed),
        uploadSpeed: Math.round(txSpeed),
        status:
          mainInterface && mainInterface.operstate === "up"
            ? "connected"
            : "unknown",
      },
      systemStatus: getOverallStatus(memUsage, cpuLoad, diskStats ?? []),
      gpu: formatGpuInfo(graphics, t),
      ...(diskStats ? { disks: formatDiskStats(diskStats) } : {}),
    };

    if (sseBroadcaster.hasClients()) {
      sseBroadcaster.broadcast({
        type: "system-stats",
        timestamp: new Date().toISOString(),
        data: systemStats,
      });
    }

    return NextResponse.json(systemStats);
  } catch (error) {
    log.error("Error fetching system stats", error);
    return NextResponse.json(
      { error: "Failed to fetch system stats" },
      { status: 500 }
    );
  }
};
