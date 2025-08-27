"use client";

import { MetricCard } from "./ui/MetricCard";
import { SystemStatus } from "./ui/SystemStatus";
import { PerformanceSummary } from "./ui/PerformanceSummary";
import { Sidebar } from "./ui/Sidebar";
import {
  Clock,
  HardDrive,
  Cpu,
  Monitor,
  Wifi,
} from "lucide-react";

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
import { useState, useEffect } from "react";

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



  const updateSystemInfo = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/system-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch system stats');
      }
      const freshData = await response.json();
      setSystemInfo(freshData);
    } catch (error) {
      console.error("Failed to update system info:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime();
    updateSystemInfo();

    const updateInterval = parseInt(
      process.env.NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL || "30000"
    );

    let mounted = true;

    const doUpdate = () => {
      if (!mounted) return;
      updateTime();
      updateSystemInfo().finally(() => {
        if (mounted) {
          setTimeout(doUpdate, updateInterval);
        }
      });
    };

    setTimeout(doUpdate, updateInterval);

    return () => {
      mounted = false;
    };
  }, []);

  const quickStats = {
    cpu: systemInfo.cpu.usage,
    memory: systemInfo.memory.usage,
    network: systemInfo.network ? `${systemInfo.network.latency}ms` : "N/A",
  };

  const basicInfoItems = [
    {
      icon: Clock,
      label: "Uptime",
      value: systemInfo.uptime,
      color: "text-orange-500",
    },
  ];

  const performanceItems = [
    {
      icon: HardDrive,
      label: "Memory",
      value: `${systemInfo.memory.used} / ${systemInfo.memory.total}`,
      detail: `${systemInfo.memory.free} free`,
      status: systemInfo.memory.status,
      color: "text-cyan-500",
      showProgress: true,
      progressValue: systemInfo.memory.usage,
    },
    {
      icon: Cpu,
      label: "CPU",
      value: systemInfo.cpu.model,
      detail: `${systemInfo.cpu.cores} cores`,
      status: systemInfo.cpu.status,
      color: "text-pink-500",
      showProgress: true,
      progressValue: systemInfo.cpu.usage,
    },
    {
      icon: Monitor,
      label: "GPU",
      value: systemInfo.gpu.model,
      detail: systemInfo.gpu.memory
        ? `${systemInfo.gpu.memory} VRAM`
        : systemInfo.gpu.status,
      status: systemInfo.gpu.status,
      color: "text-indigo-500",
    },
    ...(systemInfo.network ? [{
      icon: Wifi,
      label: "Network",
      value: `${systemInfo.network.latency}ms`,
      detail: `${systemInfo.network.latency}ms latency • ${systemInfo.network.speed}`,
      status: systemInfo.network.status,
      color: "text-teal-500",
    }] : []),
  ];

  const performanceMetrics = [
    {
      label: "CPU Usage",
      value: `${systemInfo.cpu.usage}%`,
      status: systemInfo.cpu.status,
    },
    {
      label: "Memory Usage",
      value: `${systemInfo.memory.usage}%`,
      status: systemInfo.memory.status,
    },
    ...(systemInfo.network ? [{
      label: "Network Latency",
      value: `${systemInfo.network.latency}ms`,
      status: systemInfo.network.status,
    }] : []),
  ];

  return (
    <Sidebar
      title="System Overview"
      defaultCollapsed={false}
      quickStats={quickStats}
    >
      <SystemStatus
        status={systemInfo.systemStatus.overall}
        details={systemInfo.systemStatus.details}
        timestamp={currentTime}
        isUpdating={isUpdating}
      />

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
          System Information
        </h3>
        <div className="space-y-2">
          {basicInfoItems.map((item) => (
            <MetricCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
              variant="basic"
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
          Performance Metrics
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
              color={item.color}
              variant="performance"
              showProgress={item.showProgress}
              progressValue={item.progressValue}
            />
          ))}
        </div>
      </div>

      <PerformanceSummary metrics={performanceMetrics} />

      <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20 rounded-lg">
        💡 Stats update every{" "}
        {Math.round(
          parseInt(process.env.NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL || "30000") /
          1000
        )}
        s • Network speed estimated from latency
        {isUpdating && (
          <span className="ml-2 animate-pulse">🔄 Updating...</span>
        )}
      </div>
    </Sidebar>
  );
}
