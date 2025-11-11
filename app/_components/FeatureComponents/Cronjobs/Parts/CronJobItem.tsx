"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { DropdownMenu } from "@/app/_components/GlobalComponents/UIElements/DropdownMenu";
import {
  Trash2,
  Edit,
  Files,
  User,
  Play,
  Pause,
  Code,
  Info,
  FileOutput,
  FileX,
  FileText,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Download,
  Hash,
  Check,
} from "lucide-react";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { JobError } from "@/app/_utils/error-utils";
import { ErrorBadge } from "@/app/_components/GlobalComponents/Badges/ErrorBadge";
import {
  parseCronExpression,
  type CronExplanation,
} from "@/app/_utils/parser-utils";
import { unwrapCommand } from "@/app/_utils/wrapper-utils-client";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { copyToClipboard } from "@/app/_utils/global-utils";

interface CronJobItemProps {
  job: CronJob;
  errors: JobError[];
  runningJobId: string | null;
  deletingId: string | null;
  onRun: (id: string) => void;
  onEdit: (job: CronJob) => void;
  onClone: (job: CronJob) => void;
  onResume: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (job: CronJob) => void;
  onToggleLogging: (id: string) => void;
  onViewLogs: (job: CronJob) => void;
  onBackup: (id: string) => void;
  onErrorClick: (error: JobError) => void;
  onErrorDismiss: () => void;
}

export const CronJobItem = ({
  job,
  errors,
  runningJobId,
  deletingId,
  onRun,
  onEdit,
  onClone,
  onResume,
  onPause,
  onDelete,
  onToggleLogging,
  onViewLogs,
  onBackup,
  onErrorClick,
  onErrorDismiss,
}: CronJobItemProps) => {
  const [cronExplanation, setCronExplanation] =
    useState<CronExplanation | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const locale = useLocale();
  const t = useTranslations();
  const displayCommand = unwrapCommand(job.command);
  const [commandCopied, setCommandCopied] = useState<string | null>(null);

  useEffect(() => {
    if (job.schedule) {
      const explanation = parseCronExpression(job.schedule, locale);
      setCronExplanation(explanation);
    } else {
      setCronExplanation(null);
    }
  }, [job.schedule]);

  const dropdownMenuItems = [
    {
      label: t("cronjobs.editCronJob"),
      icon: <Edit className="h-3 w-3" />,
      onClick: () => onEdit(job),
    },
    {
      label: job.logsEnabled
        ? t("cronjobs.disableLogging")
        : t("cronjobs.enableLogging"),
      icon: job.logsEnabled ? (
        <FileX className="h-3 w-3" />
      ) : (
        <FileOutput className="h-3 w-3" />
      ),
      onClick: () => onToggleLogging(job.id),
    },
    ...(job.logsEnabled
      ? [
          {
            label: t("cronjobs.viewLogs"),
            icon: <FileText className="h-3 w-3" />,
            onClick: () => onViewLogs(job),
          },
        ]
      : []),
    {
      label: job.paused
        ? t("cronjobs.resumeCronJob")
        : t("cronjobs.pauseCronJob"),
      icon: job.paused ? (
        <Play className="h-3 w-3" />
      ) : (
        <Pause className="h-3 w-3" />
      ),
      onClick: () => (job.paused ? onResume(job.id) : onPause(job.id)),
    },
    {
      label: t("cronjobs.cloneCronJob"),
      icon: <Files className="h-3 w-3" />,
      onClick: () => onClone(job),
    },
    {
      label: t("cronjobs.backupJob"),
      icon: <Download className="h-3 w-3" />,
      onClick: () => onBackup(job.id),
    },
    {
      label: t("cronjobs.deleteCronJob"),
      icon: <Trash2 className="h-3 w-3" />,
      onClick: () => onDelete(job),
      variant: "destructive" as const,
      disabled: deletingId === job.id,
    },
  ];
  return (
    <div
      key={job.id}
      className={`glass-card p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors ${
        isDropdownOpen ? "relative z-10" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <code className="text-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded font-mono border border-purple-500/20">
              {job.schedule}
            </code>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0 w-full">
                {commandCopied === job.id && (
                  <Check className="h-3 w-3 text-green-600" />
                )}
                <pre
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(unwrapCommand(job.command));
                    setCommandCopied(job.id);
                    setTimeout(() => setCommandCopied(null), 3000);
                  }}
                  className="w-full cursor-pointer overflow-x-auto text-sm font-medium text-foreground bg-muted/30 px-2 py-1 rounded border border-border/30 hide-scrollbar"
                >
                  {unwrapCommand(displayCommand)}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className="flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded border border-border/30 cursor-pointer hover:bg-muted/70 transition-colors relative">
              <User className="h-3 w-3" />
              <span>{job.user}</span>
            </div>

            <div
              className="flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded border border-border/30 cursor-pointer hover:bg-muted/70 transition-colors relative"
              title="Click to copy Job UUID"
              onClick={async () => {
                const success = await copyToClipboard(job.id);
                if (success) {
                  setShowCopyConfirmation(true);
                  setTimeout(() => setShowCopyConfirmation(false), 3000);
                }
              }}
            >
              {showCopyConfirmation ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
              <span className="font-mono">{job.id}</span>
            </div>

            {job.paused && (
              <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">
                {t("cronjobs.paused")}
              </span>
            )}

            {job.logsEnabled && (
              <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                {t("cronjobs.logged")}
              </span>
            )}

            {job.logsEnabled && job.logError?.hasError && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLogs(job);
                }}
                className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer"
                title="Latest execution failed - Click to view error log"
              >
                <AlertCircle className="h-3 w-3" />
                <span>
                  {t("cronjobs.failed", {
                    exitCode: job.logError?.exitCode?.toString() ?? "",
                  })}
                </span>
              </button>
            )}

            {job.logsEnabled &&
              !job.logError?.hasError &&
              job.logError?.hasHistoricalFailures && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewLogs(job);
                  }}
                  className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors cursor-pointer"
                  title="Latest execution succeeded, but has historical failures - Click to view logs"
                >
                  <CheckCircle className="h-3 w-3" />
                  <span>{t("cronjobs.healthy")}</span>
                  <AlertTriangle className="h-3 w-3" />
                </button>
              )}

            {job.logsEnabled &&
              !job.logError?.hasError &&
              !job.logError?.hasHistoricalFailures &&
              job.logError?.latestExitCode === 0 && (
                <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded border border-green-500/30">
                  <CheckCircle className="h-3 w-3" />
                  <span>{t("cronjobs.healthy")}</span>
                </div>
              )}

            {!job.logsEnabled && (
              <ErrorBadge
                errors={errors}
                onErrorClick={onErrorClick}
                onErrorDismiss={onErrorDismiss}
              />
            )}
          </div>

          {job.comment && (
            <div className="flex items-center gap-2 pb-2 pt-4">
              {cronExplanation?.isValid && (
                <div className="flex items-start gap-1.5 border-b border-primary/30 bg-primary/10 rounded text-primary px-2 py-0.5">
                  <Info className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs italic">
                    {cronExplanation.humanReadable}
                  </p>
                </div>
              )}

              <p
                className="text-xs text-muted-foreground italic truncate"
                title={job.comment}
              >
                {job.comment}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRun(job.id)}
              disabled={runningJobId === job.id || job.paused}
              className="btn-outline h-8 px-3"
              title={t("cronjobs.runCronManually")}
              aria-label={t("cronjobs.runCronManually")}
            >
              {runningJobId === job.id ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Code className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (job.paused) {
                  onResume(job.id);
                } else {
                  onPause(job.id);
                }
              }}
              className="btn-outline h-8 px-3"
              title={t("cronjobs.pauseCronJob")}
              aria-label={t("cronjobs.pauseCronJob")}
            >
              {job.paused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleLogging(job.id)}
              className="btn-outline h-8 px-3"
              title={
                job.logsEnabled
                  ? t("cronjobs.disableLogging")
                  : t("cronjobs.enableLogging")
              }
              aria-label={
                job.logsEnabled
                  ? t("cronjobs.disableLogging")
                  : t("cronjobs.enableLogging")
              }
            >
              {job.logsEnabled ? (
                <FileX className="h-3 w-3" />
              ) : (
                <FileOutput className="h-3 w-3" />
              )}
            </Button>
          </div>

          <DropdownMenu
            items={dropdownMenuItems}
            onOpenChange={setIsDropdownOpen}
          />
        </div>
      </div>
    </div>
  );
};
