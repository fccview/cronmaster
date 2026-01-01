import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";
import { PulseIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

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
    const t = useTranslations();
    const getStatusConfig = (status: string) => {
      const lowerStatus = status.toLowerCase();

      switch (lowerStatus) {
        case "operational":
          return {
            bgColor: "bg-background0",
            borderColor: "ascii-border",
            dotColor: "bg-status-success",
          };
        case "warning":
          return {
            bgColor: "bg-background0",
            borderColor: "ascii-border",
            dotColor: "bg-status-warning",
          };
        case "critical":
          return {
            bgColor: "bg-background0",
            borderColor: "ascii-border",
            dotColor: "bg-status-error",
          };
        default:
          return {
            bgColor: "bg-background0",
            borderColor: "ascii-border",
            dotColor: "bg-status-success",
          };
      }
    };

    const config = getStatusConfig(status);

    return (
      <div
        ref={ref}
        className={cn(
          "p-4 glass-card terminal-font",
          config.bgColor,
          config.borderColor,
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3", config.dotColor)} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <PulseIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {t("system.systemStatus")}: {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {details} • {t("system.lastUpdated")}: {timestamp}
              {isUpdating && <span className="ml-2 animate-pulse">🔄</span>}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

SystemStatus.displayName = "SystemStatus";
