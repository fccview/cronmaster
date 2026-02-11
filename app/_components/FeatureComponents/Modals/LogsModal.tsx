"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { FileTextIcon, TrashIcon, EyeIcon, XIcon, ArrowsClockwiseIcon, WarningCircleIcon, CheckCircleIcon, DownloadIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { zipSync, strToU8 } from "fflate";
import {
  getJobLogs,
  getLogContent,
  deleteLogFile,
  deleteAllJobLogs,
  getJobLogStats,
} from "@/app/_server/actions/logs";

interface LogEntry {
  filename: string;
  timestamp: string;
  fullPath: string;
  size: number;
  dateCreated: Date;
  exitCode?: number;
  hasError?: boolean;
}

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobComment?: string;
  preSelectedLog?: string;
}

export const LogsModal = ({
  isOpen,
  onClose,
  jobId,
  jobComment,
  preSelectedLog,
}: LogsModalProps) => {
  const t = useTranslations();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [stats, setStats] = useState<{
    count: number;
    totalSize: number;
    totalSizeMB: number;
  } | null>(null);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getJobLogs(jobId, false, true),
        getJobLogStats(jobId),
      ]);

      setLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs().then(() => {
        if (preSelectedLog) {
          handleViewLog(preSelectedLog);
        }
      });
      if (!preSelectedLog) {
        setSelectedLog(null);
        setLogContent("");
      }
    }
  }, [isOpen, jobId, preSelectedLog]);

  const handleViewLog = async (filename: string) => {
    setIsLoadingContent(true);
    setSelectedLog(filename);
    try {
      const content = await getLogContent(jobId, filename);
      setLogContent(content);
    } catch (error) {
      console.error("Error loading log content:", error);
      setLogContent("Error loading log content");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleDeleteLog = async (filename: string) => {
    if (!confirm(t("cronjobs.confirmDeleteLog"))) return;

    try {
      const result = await deleteLogFile(jobId, filename);
      if (result.success) {
        await loadLogs();
        if (selectedLog === filename) {
          setSelectedLog(null);
          setLogContent("");
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error deleting log:", error);
      alert("Error deleting log file");
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!confirm(t("cronjobs.confirmDeleteAllLogs"))) return;

    try {
      const result = await deleteAllJobLogs(jobId);
      if (result.success) {
        await loadLogs();
        setSelectedLog(null);
        setLogContent("");
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error deleting all logs:", error);
      alert("Error deleting all logs");
    }
  };

  const handleDownloadLogs = async () => {
    if (logs.length === 0) return;
    setIsDownloading(true);
    try {
      const files: Record<string, Uint8Array> = {};
      for (const log of logs) {
        const content = await getLogContent(jobId, log.filename);
        files[log.filename] = strToU8(content);
      }
      const zipped = zipSync(files);
      const blob = new Blob([zipped as unknown as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jobComment || jobId}_logs.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const [datePart, timePart] = timestamp.split("_");
    const [year, month, day] = datePart.split("-");
    const [hour, minute, second] = timePart.split("-");
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
    return date.toLocaleString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("cronjobs.viewLogs")} size="xl">
      <div className="flex flex-col h-[600px]">
        <div className="block sm:flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="min-w-0 mb-4 sm:mb-0">
            <h3 className="font-semibold text-lg truncate">{jobComment || jobId}</h3>
            {stats && (
              <p className="text-sm text-muted-foreground">
                {stats.count} {t("cronjobs.logs")} • {stats.totalSizeMB} MB
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleDownloadLogs}
              disabled={logs.length === 0 || isDownloading}
              className="btn-primary glow-primary"
              size="sm"
            >
              {isDownloading ? (
                <ArrowsClockwiseIcon className="w-4 h-4 sm:mr-2 animate-spin" />
              ) : (
                <DownloadIcon className="w-4 h-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{t("cronjobs.downloadLog")}</span>
            </Button>
            <Button
              onClick={loadLogs}
              disabled={isLoadingLogs}
              className="btn-primary glow-primary"
              size="sm"
            >
              <ArrowsClockwiseIcon
                className={`w-4 h-4 sm:mr-2 ${isLoadingLogs ? "animate-spin" : ""
                  }`}
              />
              <span className="hidden sm:inline">{t("common.refresh")}</span>
            </Button>
            {logs.length > 0 && (
              <Button
                onClick={handleDeleteAllLogs}
                variant="destructive"
                size="sm"
              >
                <TrashIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("cronjobs.deleteAll")}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row gap-4 overflow-hidden">
          <div className="sm:w-1/3 flex flex-col sm:border-r border-b sm:border-b-0 border-border sm:pr-4 pb-4 sm:pb-0 overflow-hidden max-h-[40%] sm:max-h-none">
            <h4 className="font-semibold mb-2">{t("cronjobs.logFiles")}</h4>
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingLogs ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("common.loading")}...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("cronjobs.noLogsFound")}
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.filename}
                    className={`p-3 ascii-border cursor-pointer transition-colors terminal-font ${selectedLog === log.filename
                      ? "border-primary bg-background2"
                      : log.hasError
                        ? "border-red-600 hover:border-red-600"
                        : "ascii-border hover:border-primary"
                      }`}
                    onClick={() => handleViewLog(log.filename)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {log.hasError ? (
                            <WarningCircleIcon className="w-4 h-4 flex-shrink-0 text-status-error" />
                          ) : log.exitCode === 0 ? (
                            <CheckCircleIcon className="w-4 h-4 flex-shrink-0 text-status-success" />
                          ) : (
                            <FileTextIcon className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(log.size)}
                          </p>
                          {log.exitCode !== undefined && (
                            <span
                              className={`text-xs px-1.5 py-0.5 ${log.hasError
                                ? "bg-background2 text-status-error"
                                : "bg-background2 text-status-success"
                                }`}
                            >
                              Exit: {log.exitCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(log.filename);
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <h4 className="font-semibold mb-2">{t("cronjobs.logContent")}</h4>
            <div className="flex-1 overflow-hidden">
              {isLoadingContent ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {t("common.loading")}...
                </div>
              ) : selectedLog ? (
                <pre className="h-full overflow-auto bg-background0 tui-scrollbar p-4 ascii-border text-xs font-mono whitespace-pre-wrap terminal-font">
                  {logContent}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <EyeIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t("cronjobs.selectLogToView")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button onClick={onClose} className="btn-primary glow-primary">
            <XIcon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("common.close")}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
