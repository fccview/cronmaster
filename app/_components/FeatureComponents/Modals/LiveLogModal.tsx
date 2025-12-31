"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CircleNotchIcon, CheckCircleIcon, XCircleIcon, WarningIcon, ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { useSSEContext } from "@/app/_contexts/SSEContext";
import { SSEEvent } from "@/app/_utils/sse-events";
import { usePageVisibility } from "@/app/_hooks/usePageVisibility";
import { useTranslations } from "next-intl";

interface LiveLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string;
  jobId: string;
  jobComment?: string;
}

const MAX_LINES_FULL_RENDER = 10000;
const TAIL_LINES = 5000;

export const LiveLogModal = ({
  isOpen,
  onClose,
  runId,
  jobId,
  jobComment,
}: LiveLogModalProps) => {
  const t = useTranslations();
  const [logContent, setLogContent] = useState<string>("");
  const [status, setStatus] = useState<"running" | "completed" | "failed">(
    "running"
  );
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [tailMode, setTailMode] = useState<boolean>(false);
  const [showSizeWarning, setShowSizeWarning] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useSSEContext();
  const isPageVisible = usePageVisibility();
  const lastOffsetRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [lineCount, setLineCount] = useState<number>(0);
  const [maxLines, setMaxLines] = useState<number>(500);
  const [totalLines, setTotalLines] = useState<number>(0);
  const [truncated, setTruncated] = useState<boolean>(false);
  const [showFullLog, setShowFullLog] = useState<boolean>(false);
  const [isJobComplete, setIsJobComplete] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      lastOffsetRef.current = 0;
      setLogContent("");
      setTailMode(false);
      setShowSizeWarning(false);
      setFileSize(0);
      setLineCount(0);
      setShowFullLog(false);
      setIsJobComplete(false);
    }
  }, [isOpen, runId]);

  useEffect(() => {
    if (isOpen && runId && !isJobComplete) {
      lastOffsetRef.current = 0;
      setLogContent("");
      fetchLogs();
    }
  }, [maxLines]);

  const fetchLogs = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const url = `/api/logs/stream?runId=${runId}&offset=${lastOffsetRef.current}&maxLines=${maxLines}`;
      const response = await fetch(url, {
        signal: abortController.signal,
      });
      const data = await response.json();

      if (data.fileSize !== undefined) {
        lastOffsetRef.current = data.fileSize;
        setFileSize(data.fileSize);

        if (data.fileSize > 10 * 1024 * 1024) {
          setShowSizeWarning(true);
        }
      }

      if (data.totalLines !== undefined) {
        setTotalLines(data.totalLines);
      }
      setLineCount(data.displayedLines || 0);

      if (data.truncated !== undefined) {
        setTruncated(data.truncated);
      }

      if (lastOffsetRef.current === 0 && data.content) {
        setLogContent(data.content);

        if (data.truncated) {
          setTailMode(true);
        }
      } else if (data.newContent) {
        setLogContent((prev) => {
          const combined = prev + data.newContent;
          const lines = combined.split("\n");

          if (lines.length > maxLines) {
            return lines.slice(-maxLines).join("\n");
          }

          return combined;
        });
      }

      const jobStatus = data.status || "running";
      setStatus(jobStatus);

      if (jobStatus === "completed" || jobStatus === "failed") {
        setIsJobComplete(true);
      }

      if (data.exitCode !== undefined) {
        setExitCode(data.exitCode);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch logs:", error);
      }
    }
  }, [runId, maxLines]);

  useEffect(() => {
    if (!isOpen || !runId || !isPageVisible) return;

    fetchLogs();

    let interval: NodeJS.Timeout | null = null;
    if (isPageVisible && !isJobComplete) {
      interval = setInterval(fetchLogs, 3000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, runId, isPageVisible, fetchLogs, isJobComplete]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribe((event: SSEEvent) => {
      if (event.type === "job-completed" && event.data.runId === runId) {
        setStatus("completed");
        setExitCode(event.data.exitCode);

        fetch(`/api/logs/stream?runId=${runId}&offset=0`)
          .then((res) => res.json())
          .then((data) => {
            if (data.content) {
              const lines = data.content.split("\n");
              setLineCount(lines.length);
              if (tailMode && lines.length > TAIL_LINES) {
                setLogContent(lines.slice(-TAIL_LINES).join("\n"));
              } else {
                setLogContent(data.content);
              }
            }
          });
      } else if (event.type === "job-failed" && event.data.runId === runId) {
        setStatus("failed");
        setExitCode(event.data.exitCode);

        fetch(`/api/logs/stream?runId=${runId}&offset=0`)
          .then((res) => res.json())
          .then((data) => {
            if (data.content) {
              const lines = data.content.split("\n");
              setLineCount(lines.length);
              if (tailMode && lines.length > TAIL_LINES) {
                setLogContent(lines.slice(-TAIL_LINES).join("\n"));
              } else {
                setLogContent(data.content);
              }
            }
          });
      }
    });

    return unsubscribe;
  }, [isOpen, runId, subscribe, tailMode]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [logContent]);

  const toggleTailMode = () => {
    setTailMode(!tailMode);
    if (!tailMode) {
      const lines = logContent.split("\n");
      if (lines.length > TAIL_LINES) {
        setLogContent(lines.slice(-TAIL_LINES).join("\n"));
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const titleWithStatus = (
    <div className="flex items-center gap-3">
      <span>{t("cronjobs.liveJobExecution")}{jobComment && `: ${jobComment}`}</span>
      {status === "running" && (
        <span className="flex items-center gap-1 text-sm text-status-info">
          <CircleNotchIcon className="w-4 h-4 animate-spin" />
          {t("cronjobs.running")}
        </span>
      )}
      {status === "completed" && (
        <span className="flex items-center gap-1 text-sm text-status-success">
          <CheckCircleIcon className="w-4 h-4" />
          {t("cronjobs.completed", { exitCode: exitCode ?? 0 })}
        </span>
      )}
      {status === "failed" && (
        <span className="flex items-center gap-1 text-sm text-status-error">
          <XCircleIcon className="w-4 h-4" />
          {t("cronjobs.jobFailed", { exitCode: exitCode ?? 1 })}
        </span>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleWithStatus as any}
      size="xl"
      preventCloseOnClickOutside={status === "running"}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!showFullLog ? (
              <>
                <label htmlFor="maxLines" className="text-sm text-muted-foreground">
                  {t("cronjobs.showLast")}
                </label>
                <select
                  id="maxLines"
                  value={maxLines}
                  onChange={(e) => setMaxLines(parseInt(e.target.value, 10))}
                  className="bg-background0 border border-border rounded px-2 py-1 text-sm"
                >
                  <option value="100">{t("cronjobs.nLines", { count: "100" })}</option>
                  <option value="500">{t("cronjobs.nLines", { count: "500" })}</option>
                  <option value="1000">{t("cronjobs.nLines", { count: "1,000" })}</option>
                  <option value="2000">{t("cronjobs.nLines", { count: "2,000" })}</option>
                  <option value="5000">{t("cronjobs.nLines", { count: "5,000" })}</option>
                </select>
                {truncated && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowFullLog(true);
                      setMaxLines(50000);
                    }}
                    className="text-xs"
                  >
                    {totalLines > 0
                      ? t("cronjobs.viewFullLog", { totalLines: totalLines.toLocaleString() })
                      : t("cronjobs.viewFullLogNoCount")}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {totalLines > 0
                    ? t("cronjobs.viewingFullLog", { totalLines: totalLines.toLocaleString() })
                    : t("cronjobs.viewingFullLogNoCount")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFullLog(false);
                    setMaxLines(500);
                  }}
                  className="text-xs"
                >
                  {t("cronjobs.backToWindowedView")}
                </Button>
              </div>
            )}
          </div>
          {truncated && !showFullLog && (
            <div className="text-sm text-status-warning flex items-center gap-1 terminal-font">
              <WarningIcon className="h-4 w-4" />
              {t("cronjobs.showingLastOf", {
                lineCount: lineCount.toLocaleString(),
                totalLines: totalLines.toLocaleString()
              })}
            </div>
          )}
        </div>

        {showSizeWarning && (
          <div className="bg-background2 ascii-border p-3 flex items-start gap-3 terminal-font">
            <WarningIcon className="h-4 w-4 text-status-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{t("cronjobs.largeLogFileDetected")}</span> ({formatFileSize(fileSize)})
                {tailMode && ` - ${t("cronjobs.tailModeEnabled", { tailLines: TAIL_LINES.toLocaleString() })}`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleTailMode}
              className="text-status-warning hover:text-status-warning hover:bg-background2 h-auto py-1 px-2 text-xs"
              title={tailMode ? t("cronjobs.showAllLines") : t("cronjobs.enableTailMode")}
            >
              {tailMode ? <ArrowsOutIcon className="h-3 w-3" /> : <ArrowsInIcon className="h-3 w-3" />}
            </Button>
          </div>
        )}

        <div className="bg-black/90 dark:bg-black/60 p-4 max-h-[60vh] overflow-auto terminal-font ascii-border">
          <pre className="text-xs font-mono text-status-success whitespace-pre-wrap break-words">
            {logContent || t("cronjobs.waitingForJobToStart")}
            <div ref={logEndRef} />
          </pre>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {t("cronjobs.runIdJobId", { runId, jobId })}
          </span>
        </div>
      </div>
    </Modal>
  );
};
