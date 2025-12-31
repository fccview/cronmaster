import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";
import { CheckCircleIcon, WarningIcon, XCircleIcon, PulseIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

export interface StatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showText?: boolean;
}

export const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  (
    {
      className,
      status,
      size = "md",
      showIcon = true,
      showText = true,
      ...props
    },
    ref
  ) => {
    const t = useTranslations();
    const getStatusConfig = (status: string) => {
      const lowerStatus = status.toLowerCase();

      switch (lowerStatus) {
        case "optimal":
        case "operational":
        case "stable":
          return {
            color: "text-status-success",
            bgColor: "bg-background0",
            icon: CheckCircleIcon,
            label: t("system.optimal"),
          };
        case "moderate":
        case "warning":
          return {
            color: "text-status-warning",
            bgColor: "bg-background0",
            icon: WarningIcon,
            label: t("system.warning"),
          };
        case "high":
        case "slow":
          return {
            color: "text-status-warning",
            bgColor: "bg-background0",
            icon: WarningIcon,
            label: t("system.high"),
          };
        case "critical":
        case "poor":
        case "offline":
          return {
            color: "text-status-error",
            bgColor: "bg-background0",
            icon: XCircleIcon,
            label: t("system.critical"),
          };
        default:
          return {
            color: "",
            bgColor: "bg-background0",
            icon: PulseIcon,
            label: t("system.unknown"),
          };
      }
    };

    const config = getStatusConfig(status);
    const IconComponent = config.icon;

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 ascii-border px-2 py-1 terminal-font",
          config.bgColor,
          {
            "text-xs": size === "sm",
            "text-sm": size === "md",
            "text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {showIcon && <IconComponent className={cn("h-3 w-3", config.color)} />}
        {showText && (
          <span className={cn("font-medium", config.color)}>
            {config.label}
          </span>
        )}
      </div>
    );
  }
);

StatusBadge.displayName = "StatusBadge";
