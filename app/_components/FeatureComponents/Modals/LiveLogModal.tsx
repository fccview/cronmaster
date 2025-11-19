"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
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
  const logEndRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useSSEContext();
  const isPageVisible = usePageVisibility();
  const lastOffsetRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen || !runId || !isPageVisible) return;

    lastOffsetRef.current = 0;
    setLogContent("");

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
        }

        if (lastOffsetRef.current === 0 && data.content) {
          setLogContent(data.content);
        } else if (data.newContent) {
          setLogContent((prev) => {
            const newContent = prev + data.newContent;
            const maxLength = 2 * 1024 * 1024;
            if (newContent.length > maxLength) {
              return (
                "[LOG CONTENT TRUNCATED FOR PERFORMANCE]\n\n" +
                newContent.slice(-maxLength + 100)
              );
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
  }, [isOpen, runId, isPageVisible]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribe((event: SSEEvent) => {
      if (event.type === "job-completed" && event.data.runId === runId) {
        setStatus("completed");
        setExitCode(event.data.exitCode);

        fetch(`/api/logs/stream?runId=${runId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.content) {
              setLogContent(data.content);
            }
          });
      } else if (event.type === "job-failed" && event.data.runId === runId) {
        setStatus("failed");
        setExitCode(event.data.exitCode);

        fetch(`/api/logs/stream?runId=${runId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.content) {
              setLogContent(data.content);
            }
          });
      }
    });

    return unsubscribe;
  }, [isOpen, runId, subscribe]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logContent]);

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
        <div className="bg-black/90 dark:bg-black/60 rounded-lg p-4 max-h-[60vh] overflow-auto">
          <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words">
            {logContent ||
              "Waiting for job to start...\n\nLogs will appear here in real-time."}
            <div ref={logEndRef} />
          </pre>
        </div>

        <div className="text-xs text-muted-foreground">
          Run ID: {runId} | Job ID: {jobId}
        </div>
      </div>
    </Modal>
  );
};
