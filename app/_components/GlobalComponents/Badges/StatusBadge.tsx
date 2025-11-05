import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";
import { CheckCircle, AlertTriangle, XCircle, Activity } from "lucide-react";
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
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            icon: CheckCircle,
            label: t("system.optimal"),
          };
        case "moderate":
        case "warning":
          return {
            color: "text-yellow-500",
            bgColor: "bg-yellow-500/10",
            borderColor: "border-yellow-500/20",
            icon: AlertTriangle,
            label: t("system.warning"),
          };
        case "high":
        case "slow":
          return {
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            icon: AlertTriangle,
            label: t("system.high"),
          };
        case "critical":
        case "poor":
        case "offline":
          return {
            color: "text-destructive",
            bgColor: "bg-destructive/10",
            borderColor: "border-destructive/20",
            icon: XCircle,
            label: t("system.critical"),
          };
        default:
          return {
            color: "text-muted-foreground",
            bgColor: "bg-muted",
            borderColor: "border-border",
            icon: Activity,
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
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-1",
          config.bgColor,
          config.borderColor,
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
