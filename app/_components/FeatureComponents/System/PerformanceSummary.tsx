import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";
import { LightningIcon } from "@phosphor-icons/react";
import { StatusBadge } from "@/app/_components/GlobalComponents/Badges/StatusBadge";

export interface PerformanceMetric {
  label: string;
  value: string;
  status: string;
}

export interface PerformanceSummaryProps
  extends HTMLAttributes<HTMLDivElement> {
  metrics: PerformanceMetric[];
}

export const PerformanceSummary = forwardRef<HTMLDivElement, PerformanceSummaryProps>(
  ({ className, metrics, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "p-3 bg-background0 ascii-border glass-card terminal-font",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 mb-3">
          <LightningIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            Performance Summary
          </span>
        </div>

        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="flex justify-between items-center text-xs"
            >
              <span className="text-muted-foreground">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {metric.value}
                </span>
                <StatusBadge
                  status={metric.status}
                  size="sm"
                  showText={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PerformanceSummary.displayName = "PerformanceSummary";
