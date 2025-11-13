"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import {
  Upload,
  Trash2,
  Calendar,
  User,
  Download,
  RefreshCw,
  Check,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { unwrapCommand } from "@/app/_utils/wrapper-utils-client";
import { copyToClipboard } from "@/app/_utils/global-utils";

interface BackupFile {
  filename: string;
  job: CronJob;
  backedUpAt: string;
}

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupFile[];
  onRestore: (filename: string) => void;
  onRestoreAll: () => void;
  onBackupAll: () => void;
  onDelete: (filename: string) => void;
  onRefresh: () => void;
}

export const RestoreBackupModal = ({
  isOpen,
  onClose,
  backups,
  onRestore,
  onRestoreAll,
  onBackupAll,
  onDelete,
  onRefresh,
}: RestoreBackupModalProps) => {
  const t = useTranslations();
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [commandCopied, setCommandCopied] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      onRefresh();
    }
  }, [isOpen]);

  const handleRestoreAll = () => {
    if (window.confirm(t("cronjobs.confirmRestoreAll"))) {
      onRestoreAll();
    }
  };

  const handleDelete = async (filename: string) => {
    if (window.confirm(t("cronjobs.confirmDeleteBackup"))) {
      setDeletingFilename(filename);
      await onDelete(filename);
      setDeletingFilename(null);
      onRefresh();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("cronjobs.backups")}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBackupAll}
            className="btn-outline flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("cronjobs.backupAll")}
          </Button>
          {backups.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRestoreAll}
              className="btn-primary flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("cronjobs.restoreAll")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onRefresh}
            className="btn-outline"
            title={t("common.refresh")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("cronjobs.noBackupsFound")}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="glass-card p-3 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Schedule */}
                  <div className="flex-shrink-0">
                    <code className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono border border-purple-500/20">
                      {backup.job.schedule}
                    </code>
                  </div>

                  {/* Command */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {commandCopied === backup.filename && (
                        <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                      )}
                      <pre
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(unwrapCommand(backup.job.command));
                          setCommandCopied(backup.filename);
                          setTimeout(() => setCommandCopied(null), 3000);
                        }}
                        className="flex-1 cursor-pointer overflow-hidden text-sm font-medium text-foreground bg-muted/30 px-2 py-1 rounded border border-border/30 truncate"
                        title={unwrapCommand(backup.job.command)}
                      >
                        {unwrapCommand(backup.job.command)}
                      </pre>
                    </div>
                  </div>

                  {/* User & Date */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{backup.job.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(backup.backedUpAt)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onRestore(backup.filename);
                        onClose();
                      }}
                      className="h-7 w-7 p-0"
                      title={t("cronjobs.restoreThisBackup")}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(backup.filename)}
                      disabled={deletingFilename === backup.filename}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      title={t("cronjobs.deleteBackup")}
                    >
                      {deletingFilename === backup.filename ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Comment (if present) */}
                {backup.job.comment && (
                  <p className="text-xs text-muted-foreground italic mt-2 ml-0">
                    {backup.job.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {t("cronjobs.availableBackups")}: {backups.length}
          </p>
          <Button variant="outline" onClick={onClose} className="btn-outline">
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
