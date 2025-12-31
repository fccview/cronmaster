"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { DropdownMenu } from "@/app/_components/GlobalComponents/UIElements/DropdownMenu";
import {
  TrashIcon,
  PencilSimpleIcon,
  FilesIcon,
  UserIcon,
  PlayIcon,
  PauseIcon,
  CodeIcon,
  InfoIcon,
  FileArrowDownIcon,
  FileXIcon,
  FileTextIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  WarningIcon,
  DownloadIcon,
  HashIcon,
  CheckIcon,
} from "@phosphor-icons/react";
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
  scheduleDisplayMode: "cron" | "human" | "both";
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
  scheduleDisplayMode,
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
      icon: <PencilSimpleIcon className="h-3 w-3" />,
      onClick: () => onEdit(job),
    },
    {
      label: job.logsEnabled
        ? t("cronjobs.disableLogging")
        : t("cronjobs.enableLogging"),
      icon: job.logsEnabled ? (
        <FileXIcon className="h-3 w-3" />
      ) : (
        <FileArrowDownIcon className="h-3 w-3" />
      ),
      onClick: () => onToggleLogging(job.id),
    },
    ...(job.logsEnabled
      ? [
        {
          label: t("cronjobs.viewLogs"),
          icon: <FileTextIcon className="h-3 w-3" />,
          onClick: () => onViewLogs(job),
        },
      ]
      : []),
    {
      label: job.paused
        ? t("cronjobs.resumeCronJob")
        : t("cronjobs.pauseCronJob"),
      icon: job.paused ? (
        <PlayIcon className="h-3 w-3" />
      ) : (
        <PauseIcon className="h-3 w-3" />
      ),
      onClick: () => (job.paused ? onResume(job.id) : onPause(job.id)),
    },
    {
      label: t("cronjobs.cloneCronJob"),
      icon: <FilesIcon className="h-3 w-3" />,
      onClick: () => onClone(job),
    },
    {
      label: t("cronjobs.backupJob"),
      icon: <DownloadIcon className="h-3 w-3" />,
      onClick: () => onBackup(job.id),
    },
    {
      label: t("cronjobs.deleteCronJob"),
      icon: <TrashIcon className="h-3 w-3" />,
      onClick: () => onDelete(job),
      variant: "destructive" as const,
      disabled: deletingId === job.id,
    },
  ];

  return (
    <div
      key={job.id}
      className={`tui-card p-4 terminal-font transition-colors ${isDropdownOpen ? "relative z-10" : ""
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {(scheduleDisplayMode === "cron" ||
              scheduleDisplayMode === "both") && (
                <code className="text-sm bg-background0 text-status-warning px-2 py-1 terminal-font ascii-border">
                  {job.schedule}
                </code>
              )}
            {scheduleDisplayMode === "human" && cronExplanation?.isValid && (
              <div className="flex items-start gap-1.5 ascii-border bg-background2 px-2 py-0.5">
                <InfoIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm italic">
                  {cronExplanation.humanReadable}
                </p>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0 w-full">
                {commandCopied === job.id && (
                  <CheckIcon className="h-3 w-3 text-status-success" />
                )}
                <pre
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(unwrapCommand(job.command));
                    setCommandCopied(job.id);
                    setTimeout(() => setCommandCopied(null), 3000);
                  }}
                  className="w-full cursor-pointer overflow-x-auto text-sm font-medium terminal-font bg-background1 px-2 py-1 ascii-border hide-scrollbar"
                >
                  {unwrapCommand(displayCommand)}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-2 pt-4">
            {scheduleDisplayMode === "both" && cronExplanation?.isValid && (
              <div className="flex items-start gap-1.5 ascii-border bg-background2 px-2 py-0.5">
                <InfoIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs italic">
                  {cronExplanation.humanReadable}
                </p>
              </div>
            )}

            {job.comment && (
              <p
                className="text-xs italic truncate"
                title={job.comment}
              >
                {job.comment}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className="flex items-center gap-1 text-xs bg-background0 px-2 py-0.5 ascii-border cursor-pointer hover:bg-background2 transition-colors relative terminal-font">
              <UserIcon className="h-3 w-3" />
              <span>{job.user}</span>
            </div>

            <div
              className="flex items-center gap-1 text-xs bg-background0 px-2 py-0.5 ascii-border cursor-pointer hover:bg-background2 transition-colors relative terminal-font"
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
                <CheckIcon className="h-3 w-3 text-status-success" />
              ) : (
                <HashIcon className="h-3 w-3" />
              )}
              <span className="font-mono">{job.id}</span>
            </div>

            {job.paused && (
              <span className="text-xs bg-background2 px-2 py-0.5 ascii-border terminal-font">
                <span className="text-status-warning">{t("cronjobs.paused")}</span>
              </span>
            )}

            {job.logsEnabled && (
              <span className="text-xs bg-background0 px-2 py-0.5 ascii-border terminal-font">
                <span className="text-status-info">{t("cronjobs.logged")}</span>
              </span>
            )}

            {job.logsEnabled && job.logError?.hasError && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLogs(job);
                }}
                className="flex items-center gap-1 text-xs bg-background0 px-2 py-0.5 ascii-border hover:bg-background1 transition-colors cursor-pointer terminal-font"
                title="Latest execution failed - Click to view error log"
              >
                <WarningCircleIcon className="h-3 w-3 text-status-error" />
                <span className="text-status-error">
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
                  className="flex items-center gap-1 text-xs bg-background0 px-2 py-0.5 ascii-border hover:bg-background1 transition-colors cursor-pointer terminal-font"
                  title="Latest execution succeeded, but has historical failures - Click to view logs"
                >
                  <CheckCircleIcon className="h-3 w-3 text-status-success" />
                  <span className="text-status-warning">{t("cronjobs.healthy")}</span>
                  <WarningIcon className="h-3 w-3 text-status-warning" />
                </button>
              )}

            {job.logsEnabled &&
              !job.logError?.hasError &&
              !job.logError?.hasHistoricalFailures &&
              job.logError?.latestExitCode === 0 && (
                <div className="flex items-center gap-1 text-xs bg-background0 px-2 py-0.5 ascii-border terminal-font">
                  <CheckCircleIcon className="h-3 w-3 text-status-success" />
                  <span className="text-status-success">{t("cronjobs.healthy")}</span>
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
                <CodeIcon className="h-3 w-3" />
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
                <PlayIcon className="h-3 w-3" />
              ) : (
                <PauseIcon className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (job.logsEnabled) {
                  onViewLogs(job);
                } else {
                  onToggleLogging(job.id);
                }
              }}
              className="btn-outline h-8 px-3"
              title={
                job.logsEnabled
                  ? t("cronjobs.viewLogs")
                  : t("cronjobs.enableLogging")
              }
              aria-label={
                job.logsEnabled
                  ? t("cronjobs.viewLogs")
                  : t("cronjobs.enableLogging")
              }
            >
              {job.logsEnabled ? (
                <FileTextIcon className="h-3 w-3" />
              ) : (
                <FileArrowDownIcon className="h-3 w-3" />
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
