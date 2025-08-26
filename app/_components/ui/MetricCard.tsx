import { cn } from "@/app/_utils/cn";
import { HTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { TruncatedText } from "./TruncatedText";

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  status?: string;
  color?: string;
  variant?: "basic" | "performance";
  showProgress?: boolean;
  progressValue?: number;
  progressMax?: number;
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
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
      showProgress = false,
      progressValue = 0,
      progressMax = 100,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors duration-200 glass-card-hover",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "p-2 rounded-lg border border-border/50 flex-shrink-0 bg-card/50"
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

          <div className="mb-1">
            <TruncatedText
              text={value}
              maxLength={40}
              className="text-sm font-medium text-foreground"
            />
          </div>

          {detail && (
            <p className="text-xs text-muted-foreground mb-2">{detail}</p>
          )}

          {showProgress && (
            <div className="mb-2">
              <ProgressBar
                value={progressValue}
                max={progressMax}
                size="sm"
                showLabel={false}
                variant="gradient"
              />
            </div>
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
