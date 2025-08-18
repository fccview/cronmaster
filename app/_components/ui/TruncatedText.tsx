import { cn } from "@/app/_utils/cn";
import { HTMLAttributes, forwardRef, useState } from "react";

export interface TruncatedTextProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  maxLength?: number;
  showTooltip?: boolean;
  className?: string;
}

const TruncatedText = forwardRef<HTMLDivElement, TruncatedTextProps>(
  ({ className, text, maxLength = 50, showTooltip = true, ...props }, ref) => {
    const [showTooltipState, setShowTooltipState] = useState(false);
    const shouldTruncate = text.length > maxLength;
    const displayText = shouldTruncate
      ? `${text.slice(0, maxLength)}...`
      : text;

    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        onMouseEnter={() =>
          shouldTruncate && showTooltip && setShowTooltipState(true)
        }
        onMouseLeave={() => setShowTooltipState(false)}
        {...props}
      >
        <div className={cn("break-words", shouldTruncate && "cursor-help")}>
          {displayText}
        </div>

        {showTooltip && shouldTruncate && showTooltipState && (
          <div className="absolute bottom-full left-0 mb-2 px-3 py-2 text-sm bg-popover text-popover-foreground rounded-lg shadow-lg z-50 max-w-xs break-words border border-border">
            {text}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
          </div>
        )}
      </div>
    );
  }
);

TruncatedText.displayName = "TruncatedText";

export { TruncatedText };
