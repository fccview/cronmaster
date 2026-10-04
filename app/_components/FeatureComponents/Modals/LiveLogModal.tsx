"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CircleNotchIcon, CheckCircleIcon, XCircleIcon, WarningIcon, ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { LogViewer } from "@/app/_components/GlobalComponents/UIElements/LogViewer";
import { useSSEContext } from "@/app/_contexts/SSEContext";
import { SSEEvent } from "@/app/_utils/sse-events";
import { usePageVisibility } from "@/app/_hooks/usePageVisibility";
import { splitLogLines } from "@/app/_utils/log-format-utils";
import { useTranslations } from "next-intl";
import { createLogger } from "@/app/_utils/logger";
import { isAbortError } from "@/app/_utils/error-utils";
import {
  EMPTY_LIVE_LOG,
  applyLiveLogChunk,
  keepLastLines,
  type LiveLogBuffer,
} from "@/app/_utils/live-log-utils";
import { formatBytes } from "@/app/_utils/format-utils";

const log = createLogger("ui:logs");

interface LiveLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string;
  jobId: string;
  jobComment?: string;
}

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
  const { subscribe } = useSSEContext();
  const isPageVisible = usePageVisibility();
  const bufferRef = useRef<LiveLogBuffer>(EMPTY_LIVE_LOG);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [lineCount, setLineCount] = useState<number>(0);
  const [maxLines, setMaxLines] = useState<number>(500);
  const [totalLines, setTotalLines] = useState<number>(0);
  const [truncated, setTruncated] = useState<boolean>(false);
  const [showFullLog, setShowFullLog] = useState<boolean>(false);
  const [isJobComplete, setIsJobComplete] = useState<boolean>(false);
  const openRunId = isOpen ? runId : null;
  const [resetForRunId, setResetForRunId] = useState<string | null>(null);

  if (openRunId !== resetForRunId) {
    setResetForRunId(openRunId);
    if (isOpen) {
      setLogContent("");
      setStatus("running");
      setExitCode(null);
      setTailMode(false);
      setShowSizeWarning(false);
      setFileSize(0);
      setLineCount(0);
      setTotalLines(0);
      setTruncated(false);
      setShowFullLog(false);
      setIsJobComplete(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      bufferRef.current = EMPTY_LIVE_LOG;
    }
  }, [isOpen, runId]);

  const fetchLogs = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const requestOffset = bufferRef.current.offset;

    try {
      const url = `/api/logs/stream?runId=${encodeURIComponent(runId)}&offset=${requestOffset}&maxLines=${maxLines}`;
      const response = await fetch(url, {
        signal: abortController.signal,
      });
      const data = await response.json();

      if (abortController.signal.aborted) {
        return;
      }

      const next = applyLiveLogChunk(
        bufferRef.current,
        requestOffset,
        data,
        maxLines
      );

      if (!next) {
        return;
      }

      bufferRef.current = next;
      setLogContent(next.content);

      if (data.fileSize !== undefined) {
        setFileSize(data.fileSize);

        if (data.fileSize > 10 * 1024 * 1024) {
          setShowSizeWarning(true);
        }
      }

      if (requestOffset === 0) {
        setLineCount(data.displayedLines || 0);

        if (data.totalLines !== undefined) {
          setTotalLines(data.totalLines);
        }

        if (data.truncated !== undefined) {
          setTruncated(data.truncated);
        }

        if (data.truncated) {
          setTailMode(true);
        }
      }

      if (data.status === "completed" || data.status === "failed") {
        setStatus(data.status);
        setIsJobComplete(true);
      }

      if (data.exitCode !== undefined) {
        setExitCode(data.exitCode);
      }
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        log.error("Failed to fetch logs", error);
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
      if (
        (event.type === "job-completed" || event.type === "job-failed") &&
        event.data.runId === runId
      ) {
        setStatus(event.type === "job-completed" ? "completed" : "failed");
        setExitCode(event.data.exitCode);
        setIsJobComplete(true);
      }
    });

    return unsubscribe;
  }, [isOpen, runId, subscribe]);

  const changeMaxLines = (nextMaxLines: number) => {
    if (nextMaxLines !== maxLines && isOpen && runId && !isJobComplete) {
      bufferRef.current = EMPTY_LIVE_LOG;
      setLogContent("");
    }
    setMaxLines(nextMaxLines);
  };

  const toggleTailMode = () => {
    setTailMode(!tailMode);
    if (!tailMode) {
      const content = keepLastLines(bufferRef.current.content, TAIL_LINES);
      bufferRef.current = { ...bufferRef.current, content };
      setLogContent(content);
    }
  };

  const visibleLineCount = splitLogLines(logContent).length;
  const startLine =
    truncated && !showFullLog && totalLines > visibleLineCount
      ? totalLines - visibleLineCount + 1
      : 1;

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
      title={titleWithStatus}
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
                  onChange={(e) => changeMaxLines(parseInt(e.target.value, 10))}
                  className="bg-background0 ascii-border px-2 py-1 text-sm"
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
                      changeMaxLines(50000);
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
                    changeMaxLines(500);
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
                <span className="font-medium">{t("cronjobs.largeLogFileDetected")}</span> ({formatBytes(fileSize)})
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

        <LogViewer
          className="h-[55vh] min-h-[240px]"
          content={logContent}
          follow
          startLine={startLine}
          title={t("cronjobs.runIdJobId", { runId, jobId })}
          meta={fileSize > 0 ? formatBytes(fileSize) : undefined}
          placeholder={t("cronjobs.waitingForJobToStart")}
        />
      </div>
    </Modal>
  );
};
