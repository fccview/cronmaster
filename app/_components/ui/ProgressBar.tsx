import { cn } from "@/app/_utils/cn";
import { HTMLAttributes, forwardRef } from "react";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient";
}

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      showLabel = true,
      size = "md",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const getColorClass = (percentage: number) => {
      if (percentage >= 90) return "bg-destructive";
      if (percentage >= 80) return "bg-orange-500";
      if (percentage >= 70) return "bg-yellow-500";
      return "bg-emerald-500";
    };

    const getGradientClass = (percentage: number) => {
      if (percentage >= 90)
        return "bg-gradient-to-r from-destructive to-red-600";
      if (percentage >= 80)
        return "bg-gradient-to-r from-orange-500 to-orange-600";
      if (percentage >= 70)
        return "bg-gradient-to-r from-yellow-500 to-yellow-600";
      return "bg-gradient-to-r from-emerald-500 to-emerald-600";
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Usage</span>
            <span className="text-xs font-medium text-foreground">
              {Math.round(percentage)}%
            </span>
          </div>
        )}

        <div
          className={cn("w-full bg-muted rounded-full overflow-hidden", {
            "h-1.5": size === "sm",
            "h-2": size === "md",
            "h-3": size === "lg",
          })}
        >
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              variant === "gradient"
                ? getGradientClass(percentage)
                : getColorClass(percentage)
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
