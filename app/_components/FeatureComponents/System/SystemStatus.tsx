import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";
import { Activity } from "lucide-react";

export interface SystemStatusProps extends HTMLAttributes<HTMLDivElement> {
  status: string;
  details: string;
  timestamp: string;
  isUpdating?: boolean;
}

export const SystemStatus = forwardRef<HTMLDivElement, SystemStatusProps>(
  (
    { className, status, details, timestamp, isUpdating = false, ...props },
    ref
  ) => {
    const getStatusConfig = (status: string) => {
      const lowerStatus = status.toLowerCase();

      switch (lowerStatus) {
        case "operational":
          return {
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            dotColor: "bg-emerald-500",
          };
        case "warning":
          return {
            bgColor: "bg-yellow-500/10",
            borderColor: "border-yellow-500/20",
            dotColor: "bg-yellow-500",
          };
        case "critical":
          return {
            bgColor: "bg-destructive/10",
            borderColor: "border-destructive/20",
            dotColor: "bg-destructive",
          };
        default:
          return {
            bgColor: "bg-muted",
            borderColor: "border-border",
            dotColor: "bg-muted-foreground",
          };
      }
    };

    const config = getStatusConfig(status);

    return (
      <div
        ref={ref}
        className={cn(
          "p-4 border border-border/50 rounded-lg glass-card",
          config.bgColor,
          config.borderColor,
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full", config.dotColor)} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                System Status: {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {details} • Last updated: {timestamp}
              {isUpdating && <span className="ml-2 animate-pulse">🔄</span>}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

SystemStatus.displayName = "SystemStatus";
