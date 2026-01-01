"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import {
  UploadIcon,
  TrashIcon,
  CalendarIcon,
  UserIcon,
  DownloadIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
} from "@phosphor-icons/react";
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onBackupAll}
            className="btn-outline flex-1"
          >
            <DownloadIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("cronjobs.backupAll")}</span>
            <span className="sm:hidden">Backup</span>
          </Button>
          {backups.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRestoreAll}
              className="btn-primary flex-1"
            >
              <UploadIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("cronjobs.restoreAll")}</span>
              <span className="sm:hidden">Restore</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onRefresh}
            className="btn-outline sm:w-auto"
            title={t("common.refresh")}
          >
            <ArrowsClockwiseIcon className="h-4 w-4" />
            <span className="sm:hidden ml-2">Refresh</span>
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("cronjobs.noBackupsFound")}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto tui-scrollbar pr-2 pb-2">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="tui-card p-3 terminal-font"
              >
                <div className="flex flex-col gap-3 lg:hidden">
                  <div className="flex items-center justify-between">
                    <code className="text-xs bg-background0 text-status-warning px-1.5 py-0.5 terminal-font ascii-border">
                      {backup.job.schedule}
                    </code>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onRestore(backup.filename);
                          onClose();
                        }}
                        className="btn-outline h-8 px-3"
                        title={t("cronjobs.restoreThisBackup")}
                      >
                        <UploadIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(backup.filename)}
                        disabled={deletingFilename === backup.filename}
                        className="h-8 px-3"
                        title={t("cronjobs.deleteBackup")}
                      >
                        {deletingFilename === backup.filename ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <TrashIcon className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {commandCopied === backup.filename && (
                      <CheckIcon className="h-3 w-3 text-status-success flex-shrink-0" />
                    )}
                    <pre
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(unwrapCommand(backup.job.command));
                        setCommandCopied(backup.filename);
                        setTimeout(() => setCommandCopied(null), 3000);
                      }}
                      className="max-w-full overflow-x-auto flex-1 cursor-pointer text-sm font-medium terminal-font bg-background1 px-2 py-1 ascii-border break-all"
                      title={unwrapCommand(backup.job.command)}
                    >
                      {unwrapCommand(backup.job.command)}
                    </pre>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      <span>{backup.job.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatDate(backup.backedUpAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <code className="text-xs bg-background0 text-status-warning px-1.5 py-0.5 terminal-font ascii-border">
                      {backup.job.schedule}
                    </code>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {commandCopied === backup.filename && (
                        <CheckIcon className="h-3 w-3 text-status-success flex-shrink-0" />
                      )}
                      <pre
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(unwrapCommand(backup.job.command));
                          setCommandCopied(backup.filename);
                          setTimeout(() => setCommandCopied(null), 3000);
                        }}
                        className="flex-1 cursor-pointer overflow-hidden text-sm font-medium terminal-font bg-background1 px-2 py-1 ascii-border truncate"
                        title={unwrapCommand(backup.job.command)}
                      >
                        {unwrapCommand(backup.job.command)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      <span>{backup.job.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatDate(backup.backedUpAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onRestore(backup.filename);
                        onClose();
                      }}
                      className="btn-outline h-8 px-3"
                      title={t("cronjobs.restoreThisBackup")}
                    >
                      <UploadIcon className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(backup.filename)}
                      disabled={deletingFilename === backup.filename}
                      className="h-8 px-3"
                      title={t("cronjobs.deleteBackup")}
                    >
                      {deletingFilename === backup.filename ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <TrashIcon className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {backup.job.comment && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    {backup.job.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            {t("cronjobs.availableBackups")}: {backups.length}
          </p>
          <Button variant="outline" onClick={onClose} className="btn-outline w-full sm:w-auto">
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
