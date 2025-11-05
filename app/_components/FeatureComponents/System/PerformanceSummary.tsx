import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";
import { Zap } from "lucide-react";
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
          "p-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-lg glass-card",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
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
