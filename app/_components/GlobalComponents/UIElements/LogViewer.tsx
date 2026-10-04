"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CopyIcon, TerminalIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { cn, copyToClipboard } from "@/app/_utils/global-utils";
import {
  LogSegment,
  formatLogLine,
  isSectionLine,
  splitLogLines,
  stripAnsi,
} from "@/app/_utils/log-format-utils";

const MAX_FORMATTED_LINES = 5000;
const FOLLOW_THRESHOLD_PX = 48;

interface LogViewerProps {
  content: string;
  title?: ReactNode;
  meta?: ReactNode;
  placeholder?: ReactNode;
  follow?: boolean;
  startLine?: number;
  className?: string;
}

const toneClasses: Record<NonNullable<LogSegment["tone"]>, string> = {
  muted: "log-viewer-muted",
  accent: "text-status-info",
  success: "text-status-success",
  error: "text-status-error",
  warning: "text-status-warning",
  info: "text-status-info",
};

const renderSegments = (segments: LogSegment[]) =>
  segments.map((segment, index) => (
    <span
      key={index}
      className={cn(
        segment.tone && toneClasses[segment.tone],
        segment.bold && "font-bold",
        segment.dim && "opacity-70"
      )}
      style={segment.color ? { color: segment.color } : undefined}
    >
      {segment.text}
    </span>
  ));

export const LogViewer = ({
  content,
  title,
  meta,
  placeholder,
  follow = false,
  startLine = 1,
  className = "",
}: LogViewerProps) => {
  const t = useTranslations();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => splitLogLines(content), [content]);
  const isFormatted = lines.length <= MAX_FORMATTED_LINES;
  const gutterWidth = `${String(startLine + lines.length).length + 1}ch`;

  useEffect(() => {
    const element = scrollRef.current;
    if (!follow || !element || !isPinnedRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [content, follow]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    isPinnedRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      FOLLOW_THRESHOLD_PX;
  };

  const handleCopy = async () => {
    if (await copyToClipboard(stripAnsi(content))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn("log-viewer flex flex-col min-h-0", className)}>
      <div className="log-viewer-header flex items-center justify-between gap-3 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <TerminalIcon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {meta && <span className="log-viewer-muted text-xs">{meta}</span>}
          {lines.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-xs gap-1"
            >
              {copied ? (
                <CheckIcon className="h-3 w-3" />
              ) : (
                <CopyIcon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {copied ? t("common.copied") : t("common.copy")}
              </span>
            </Button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="log-viewer-body tui-scrollbar flex-1 min-h-0 overflow-auto"
      >
        {lines.length === 0 ? (
          <div className="log-viewer-muted h-full flex items-center justify-center p-6 text-sm text-center whitespace-pre-line">
            {placeholder}
          </div>
        ) : isFormatted ? (
          <div
            role="log"
            className="log-viewer-lines"
            style={{ "--log-gutter": gutterWidth } as CSSProperties}
          >
            {lines.map((line, index) => (
              <div key={index} className="log-viewer-line">
                <span className="log-viewer-line-number" aria-hidden="true">
                  {startLine + index}
                </span>
                <span
                  className={cn(
                    "log-viewer-line-text",
                    isSectionLine(line) && "log-viewer-line-section"
                  )}
                >
                  {renderSegments(formatLogLine(line))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <pre role="log" className="log-viewer-plain">
            {stripAnsi(content)}
          </pre>
        )}
      </div>
    </div>
  );
};
