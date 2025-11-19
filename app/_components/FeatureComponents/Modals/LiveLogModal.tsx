"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Minimize2, Maximize2 } from "lucide-react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { useSSEContext } from "@/app/_contexts/SSEContext";
import { SSEEvent } from "@/app/_utils/sse-events";
import { usePageVisibility } from "@/app/_hooks/usePageVisibility";

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

  useEffect(() => {
    if (isOpen) {
      lastOffsetRef.current = 0;
      setLogContent("");
      setTailMode(false);
      setShowSizeWarning(false);
      setFileSize(0);
      setLineCount(0);
    }
  }, [isOpen, runId]);

  useEffect(() => {
    if (!isOpen || !runId || !isPageVisible) return;

    const fetchLogs = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const url = `/api/logs/stream?runId=${runId}&offset=${lastOffsetRef.current}`;
        const response = await fetch(url, {
          signal: abortController.signal,
        });
        const data = await response.json();

        if (data.fileSize !== undefined) {
          lastOffsetRef.current = data.fileSize;
          setFileSize(data.fileSize);

          if (data.fileSize > 10 * 1024 * 1024 && !showSizeWarning) {
            setShowSizeWarning(true);
          }
        }

        if (lastOffsetRef.current === 0 && data.content) {
          const lines = data.content.split("\n");
          setLineCount(lines.length);

          if (lines.length > MAX_LINES_FULL_RENDER) {
            setTailMode(true);
            setShowSizeWarning(true);
            setLogContent(lines.slice(-TAIL_LINES).join("\n"));
          } else {
            setLogContent(data.content);
          }
        } else if (data.newContent) {
          setLogContent((prev) => {
            const newContent = prev + data.newContent;
            const lines = newContent.split("\n");
            setLineCount(lines.length);

            if (lines.length > MAX_LINES_FULL_RENDER && !tailMode) {
              setTailMode(true);
              setShowSizeWarning(true);
              return lines.slice(-TAIL_LINES).join("\n");
            }

            if (tailMode && lines.length > TAIL_LINES) {
              return lines.slice(-TAIL_LINES).join("\n");
            }

            const maxLength = 50 * 1024 * 1024;
            if (newContent.length > maxLength) {
              setTailMode(true);
              setShowSizeWarning(true);
              const truncated = newContent.slice(-maxLength + 200);
              const truncatedLines = truncated.split("\n");
              return truncatedLines.slice(-TAIL_LINES).join("\n");
            }

            return newContent;
          });
        }

        setStatus(data.status || "running");

        if (data.exitCode !== undefined) {
          setExitCode(data.exitCode);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch logs:", error);
        }
      }
    };

    fetchLogs();

    let interval: NodeJS.Timeout | null = null;
    if (isPageVisible) {
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
  }, [isOpen, runId, isPageVisible, showSizeWarning, tailMode]);

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
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
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
      <span>Live Job Execution{jobComment && `: ${jobComment}`}</span>
      {status === "running" && (
        <span className="flex items-center gap-1 text-sm text-blue-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Running...
        </span>
      )}
      {status === "completed" && (
        <span className="flex items-center gap-1 text-sm text-green-500">
          <CheckCircle2 className="w-4 h-4" />
          Completed (Exit: {exitCode})
        </span>
      )}
      {status === "failed" && (
        <span className="flex items-center gap-1 text-sm text-red-500">
          <XCircle className="w-4 h-4" />
          Failed (Exit: {exitCode})
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
        {showSizeWarning && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">Large log file detected</span> ({formatFileSize(fileSize)})
                {tailMode && ` - Tail mode enabled, showing last ${TAIL_LINES.toLocaleString()} lines`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleTailMode}
              className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 h-auto py-1 px-2 text-xs"
              title={tailMode ? "Show all lines" : "Enable tail mode"}
            >
              {tailMode ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          </div>
        )}

        <div className="bg-black/90 dark:bg-black/60 rounded-lg p-4 max-h-[60vh] overflow-auto">
          <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words">
            {logContent ||
              "Waiting for job to start...\n\nLogs will appear here in real-time."}
            <div ref={logEndRef} />
          </pre>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            Run ID: {runId} | Job ID: {jobId}
          </span>
          <span>
            {lineCount.toLocaleString()} lines
            {tailMode && ` (showing last ${TAIL_LINES.toLocaleString()})`}
            {fileSize > 0 && ` • ${formatFileSize(fileSize)}`}
          </span>
        </div>
      </div>
    </Modal>
  );
};
