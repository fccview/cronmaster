"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { MetricCard } from "./ui/MetricCard";
import { SystemStatus } from "./ui/SystemStatus";
import { PerformanceSummary } from "./ui/PerformanceSummary";
import {
  Monitor,
  Globe,
  Clock,
  HardDrive,
  Cpu,
  Server,
  ChevronDown,
  ChevronUp,
  Wifi,
} from "lucide-react";
import { SystemInfo as SystemInfoType } from "@/app/_utils/system";
import { useState, useEffect } from "react";

interface SystemInfoCardProps {
  systemInfo: SystemInfoType;
}

export function SystemInfoCard({ systemInfo }: SystemInfoCardProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Basic system information
  const basicInfoItems = [
    {
      icon: Monitor,
      label: "Operating System",
      value: systemInfo.platform,
      color: "text-blue-500",
    },
    {
      icon: Server,
      label: "Hostname",
      value: systemInfo.hostname,
      color: "text-green-500",
    },
    {
      icon: Globe,
      label: "IP Address",
      value: systemInfo.ip,
      color: "text-purple-500",
    },
    {
      icon: Clock,
      label: "Uptime",
      value: systemInfo.uptime,
      color: "text-orange-500",
    },
  ];

  // Performance metrics
  const performanceItems = [
    {
      icon: HardDrive,
      label: "Memory",
      value: `${systemInfo.memory.used} / ${systemInfo.memory.total}`,
      detail: `${systemInfo.memory.usage}% used`,
      status: systemInfo.memory.status,
      color: "text-cyan-500",
    },
    {
      icon: Cpu,
      label: "CPU",
      value: systemInfo.cpu.model,
      detail: `${systemInfo.cpu.cores} cores • ${systemInfo.cpu.usage}% usage`,
      status: systemInfo.cpu.status,
      color: "text-pink-500",
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
    {
      icon: Wifi,
      label: "Network",
      value: systemInfo.network.speed,
      detail: `${systemInfo.network.latency}ms latency`,
      status: systemInfo.network.status,
      color: "text-teal-500",
    },
  ];

  // Performance summary metrics
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
    {
      label: "Network",
      value: systemInfo.network.speed,
      status: systemInfo.network.status,
    },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                <Server className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <CardTitle className="text-lg brand-gradient">
                  System Overview
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time system metrics
                </p>
              </div>
            </div>

            {/* Mobile accordion toggle */}
            <div className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>
      </CardHeader>

      <div className={`lg:block ${isExpanded ? "block" : "hidden"}`}>
        <CardContent className="space-y-6">
          {/* System Status */}
          <SystemStatus
            status={systemInfo.systemStatus.overall}
            details={systemInfo.systemStatus.details}
            timestamp={currentTime}
          />

          {/* Basic System Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              System Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {/* Performance Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                />
              ))}
            </div>
          </div>

          {/* Performance Summary */}
          <PerformanceSummary metrics={performanceMetrics} />
        </CardContent>
      </div>
    </Card>
  );
}
