import { cn } from "@/app/_utils/global-utils";
import { HTMLAttributes, forwardRef } from "react";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient";
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
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
      if (percentage >= 90) return "bg-red-600";
      if (percentage >= 80) return "bg-yellow-600";
      if (percentage >= 70) return "bg-yellow-600";
      return "bg-green-600";
    };

    const getGradientClass = (percentage: number) => {
      return getColorClass(percentage);
    };

    return (
      <div ref={ref} className={cn("w-full terminal-font", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs">Usage</span>
            <span className="text-xs font-medium">
              {Math.round(percentage)}%
            </span>
          </div>
        )}

        <div
          className={cn("w-full bg-background2 ascii-border overflow-hidden", {
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
