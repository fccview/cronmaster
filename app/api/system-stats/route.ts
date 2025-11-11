import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "@/app/_utils/global-utils";
import * as si from "systeminformation";
import {
  getPing,
  formatBytes,
  formatUptime,
  findMainInterface,
  getStatus,
  getOverallStatus,
  formatGpuInfo,
} from "@/app/_utils/system-stats-utils";
import { sseBroadcaster } from "@/app/_utils/sse-broadcaster";
import { requireAuth } from "@/app/_utils/api-auth-utils";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const authError = await requireAuth(request);
  if (authError) return authError;
  try {
    const t = await getTranslations();

    const [
      [memInfo, cpuInfo, loadInfo, uptimeInfo, networkInfo],
      latency,
      graphics,
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
      memory: {
        total: formatBytes(memInfo.total),
        used: formatBytes(actualUsed),
        free: formatBytes(memInfo.available || memInfo.free),
        usage: Math.round(memUsage),
        status: getStatus(
          memUsage,
          { critical: 90, high: 80, moderate: 70 },
          t
        ),
      },
      cpu: {
        model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
        cores: cpuInfo.cores,
        usage: Math.round(cpuLoad),
        status: getStatus(cpuLoad, { high: 80, moderate: 60 }, t),
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
            ? t("system.connected")
            : t("system.unknown"),
      },
      systemStatus: getOverallStatus(memUsage, cpuLoad, t),
      gpu: formatGpuInfo(graphics, t),
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
    console.error("Error fetching system stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch system stats" },
      { status: 500 }
    );
  }
};
