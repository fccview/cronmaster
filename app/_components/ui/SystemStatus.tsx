import { cn } from "@/app/_utils/cn";
import { HTMLAttributes, forwardRef } from "react";
import { Activity } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface SystemStatusProps extends HTMLAttributes<HTMLDivElement> {
  status: string;
  details: string;
  timestamp: string;
}

const SystemStatus = forwardRef<HTMLDivElement, SystemStatusProps>(
  ({ className, status, details, timestamp, ...props }, ref) => {
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
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/20",
            dotColor: "bg-red-500",
          };
        default:
          return {
            bgColor: "bg-gray-500/10",
            borderColor: "border-gray-500/20",
            dotColor: "bg-gray-500",
          };
      }
    };

    const config = getStatusConfig(status);

    return (
      <div
        ref={ref}
        className={cn(
          "p-4 border rounded-lg",
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
            </p>
          </div>
        </div>
      </div>
    );
  }
);

SystemStatus.displayName = "SystemStatus";

export { SystemStatus };
