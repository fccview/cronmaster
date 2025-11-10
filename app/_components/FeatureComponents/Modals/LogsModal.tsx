"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { FileText, Trash2, Eye, X, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
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
}

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobComment?: string;
}

export const LogsModal = ({
  isOpen,
  onClose,
  jobId,
  jobComment,
}: LogsModalProps) => {
  const t = useTranslations();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [stats, setStats] = useState<{
    count: number;
    totalSize: number;
    totalSizeMB: number;
  } | null>(null);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getJobLogs(jobId),
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
      loadLogs();
      setSelectedLog(null);
      setLogContent("");
    }
  }, [isOpen, jobId]);

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
    if (!confirm(t("confirmDeleteLog"))) return;

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
    if (!confirm(t("confirmDeleteAllLogs"))) return;

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
    <Modal isOpen={isOpen} onClose={onClose} title={t("viewLogs")} size="xl">
      <div className="flex flex-col h-[600px]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-lg">{jobComment || jobId}</h3>
            {stats && (
              <p className="text-sm text-muted-foreground">
                {stats.count} {t("logs")} • {stats.totalSizeMB} MB
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadLogs}
              disabled={isLoadingLogs}
              className="btn-primary glow-primary"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  isLoadingLogs ? "animate-spin" : ""
                }`}
              />
              {t("refresh")}
            </Button>
            {logs.length > 0 && (
              <Button
                onClick={handleDeleteAllLogs}
                className="btn-destructive glow-primary"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("deleteAll")}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-1/3 flex flex-col border-r border-border pr-4 overflow-hidden">
            <h4 className="font-semibold mb-2">{t("logFiles")}</h4>
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingLogs ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("loading")}...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("noLogsFound")}
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.filename}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedLog === log.filename
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleViewLog(log.filename)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(log.size)}
                        </p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(log.filename);
                        }}
                        className="btn-destructive glow-primary p-1 h-auto"
                        size="sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <h4 className="font-semibold mb-2">{t("logContent")}</h4>
            <div className="flex-1 overflow-hidden">
              {isLoadingContent ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {t("loading")}...
                </div>
              ) : selectedLog ? (
                <pre className="h-full overflow-auto bg-muted/50 p-4 rounded border border-border text-xs font-mono whitespace-pre-wrap">
                  {logContent}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t("selectLogToView")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button onClick={onClose} className="btn-primary glow-primary">
            <X className="w-4 h-4 mr-2" />
            {t("close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
