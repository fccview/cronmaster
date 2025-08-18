import { cn } from "@/app/_utils/cn";
import { HTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  status?: string;
  color?: string;
  variant?: "basic" | "performance";
}

const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      className,
      icon: Icon,
      label,
      value,
      detail,
      status,
      color = "text-blue-500",
      variant = "basic",
      ...props
    },
    ref
  ) => {
    const bgColor = status ? "bg-card/30" : "bg-card/30";
    const borderColor = status ? "border-border/30" : "border-border/30";

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start gap-3 p-3 border rounded-lg hover:bg-card/50 transition-colors duration-200",
          bgColor,
          borderColor,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "p-2 rounded-lg border flex-shrink-0",
            status ? "bg-card/50" : "bg-card/50",
            status ? "border-border/50" : "border-border/50"
          )}
        >
          <Icon className={cn("h-4 w-4", color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            {status && variant === "performance" && (
              <StatusBadge status={status} size="sm" showText={false} />
            )}
          </div>

          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>

          {detail && (
            <p className="text-xs text-muted-foreground mt-1">{detail}</p>
          )}

          {status && variant === "basic" && (
            <div className="mt-2">
              <StatusBadge status={status} size="sm" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

MetricCard.displayName = "MetricCard";

export { MetricCard };
