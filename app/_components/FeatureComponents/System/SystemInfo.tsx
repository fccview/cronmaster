"use client";

import { MetricCard } from "@/app/_components/GlobalComponents/Cards/MetricCard";
import { SystemStatus } from "@/app/_components/FeatureComponents/System/SystemStatus";
import { PerformanceSummary } from "@/app/_components/FeatureComponents/System/PerformanceSummary";
import { Sidebar } from "@/app/_components/FeatureComponents/Layout/Sidebar";
import { Clock, HardDrive, Cpu, Monitor, Wifi } from "lucide-react";

interface SystemInfoType {
  hostname: string;
  platform: string;
  ip?: string;
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
  network?: {
    speed: string;
    latency: number;
    downloadSpeed: number;
    uploadSpeed: number;
    status: string;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    usage: number;
    status: string;
  };
  systemStatus: {
    overall: string;
    details: string;
  };
}
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSSEContext } from "@/app/_contexts/SSEContext";
import { SSEEvent } from "@/app/_utils/sse-events";
import { usePageVisibility } from "@/app/_hooks/usePageVisibility";

interface SystemInfoCardProps {
  systemInfo: SystemInfoType;
}

export const SystemInfoCard = ({
  systemInfo: initialSystemInfo,
}: SystemInfoCardProps) => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [systemInfo, setSystemInfo] =
    useState<SystemInfoType>(initialSystemInfo);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const t = useTranslations();
  const { subscribe } = useSSEContext();
  const isPageVisible = usePageVisibility();

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateSystemInfo = async () => {
    if (isDisabled) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsUpdating(true);
      const response = await fetch("/api/system-stats", {
        signal: abortController.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch system stats");
      }
      const freshData = await response.json();
      if (freshData === null) {
        setIsDisabled(true);
        return;
      }
      setSystemInfo(freshData);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to update system info:", error);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsUpdating(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = subscribe((event: SSEEvent) => {
      if (event.type === "system-stats" && event.data !== null) {
        setSystemInfo(event.data);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime();

    if (isPageVisible) {
      updateSystemInfo();
    }

    const updateInterval = parseInt(
      process.env.NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL || "30000"
    );

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const doUpdate = () => {
      if (!mounted || !isPageVisible || isDisabled) return;
      updateTime();
      updateSystemInfo().finally(() => {
        if (mounted && isPageVisible && !isDisabled) {
          timeoutId = setTimeout(doUpdate, updateInterval);
        }
      });
    };

    if (isPageVisible && !isDisabled) {
      timeoutId = setTimeout(doUpdate, updateInterval);
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isPageVisible, isDisabled]);

  const quickStats = {
    cpu: systemInfo.cpu.usage,
    memory: systemInfo.memory.usage,
    network: systemInfo.network ? `${systemInfo.network.latency}ms` : "N/A",
  };

  const basicInfoItems = [
    {
      icon: Clock,
      label: t("sidebar.uptime"),
      value: systemInfo.uptime,
    },
  ];

  const performanceItems = [
    {
      icon: HardDrive,
      label: t("sidebar.memory"),
      value: `${systemInfo.memory.used} / ${systemInfo.memory.total}`,
      detail: `${systemInfo.memory.free} free`,
      status: systemInfo.memory.status,
      showProgress: true,
      progressValue: systemInfo.memory.usage,
    },
    {
      icon: Cpu,
      label: t("sidebar.cpu"),
      value: systemInfo.cpu.model,
      detail: `${systemInfo.cpu.cores} cores`,
      status: systemInfo.cpu.status,
      showProgress: true,
      progressValue: systemInfo.cpu.usage,
    },
    {
      icon: Monitor,
      label: t("sidebar.gpu"),
      value: systemInfo.gpu.model,
      detail: systemInfo.gpu.memory
        ? `${systemInfo.gpu.memory} VRAM`
        : systemInfo.gpu.status,
      status: systemInfo.gpu.status,
    },
    ...(systemInfo.network
      ? [
        {
          icon: Wifi,
          label: t("sidebar.network"),
          value: `${systemInfo.network.latency}ms`,
          detail: `${systemInfo.network.latency}ms latency • ${systemInfo.network.speed}`,
          status: systemInfo.network.status,
        },
      ]
      : []),
  ];

  const performanceMetrics = [
    {
      label: t("sidebar.cpuUsage"),
      value: `${systemInfo.cpu.usage}%`,
      status: systemInfo.cpu.status,
    },
    {
      label: t("sidebar.memoryUsage"),
      value: `${systemInfo.memory.usage}%`,
      status: systemInfo.memory.status,
    },
    ...(systemInfo.network
      ? [
        {
          label: t("sidebar.networkLatency"),
          value: `${systemInfo.network.latency}ms`,
          status: systemInfo.network.status,
        },
      ]
      : []),
  ];

  return (
    <Sidebar defaultCollapsed={false} quickStats={quickStats}>
      <SystemStatus
        status={systemInfo.systemStatus.overall}
        details={systemInfo.systemStatus.details}
        timestamp={currentTime}
        isUpdating={isUpdating}
      />

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
          {t("sidebar.systemInformation")}
        </h3>
        <div className="space-y-2">
          {basicInfoItems.map((item) => (
            <MetricCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              variant="basic"
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
          {t("sidebar.performanceMetrics")}
        </h3>
        <div className="space-y-2">
          {performanceItems.map((item) => (
            <MetricCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              detail={item.detail}
              status={item.status}
              variant="performance"
              showProgress={item.showProgress}
              progressValue={item.progressValue}
            />
          ))}
        </div>
      </div>

      <PerformanceSummary metrics={performanceMetrics} />

      <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20 rounded-lg">
        {t("sidebar.statsUpdateEvery")}{" "}
        {Math.round(
          parseInt(process.env.NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL || "30000") /
          1000
        )}
        s • {t("sidebar.networkSpeedEstimatedFromLatency")}
        {isUpdating && (
          <span className="ml-2 animate-pulse">{t("sidebar.updating")}...</span>
        )}
      </div>
    </Sidebar>
  );
};
