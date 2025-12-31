"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { DropdownMenu } from "@/app/_components/GlobalComponents/UIElements/DropdownMenu";
import {
  TrashIcon,
  PencilSimpleIcon,
  FilesIcon,
  PlayIcon,
  PauseIcon,
  CodeIcon,
  InfoIcon,
  DownloadIcon,
  CheckIcon,
  FileXIcon,
  FileTextIcon,
  FileArrowDownIcon,
} from "@phosphor-icons/react";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { JobError } from "@/app/_utils/error-utils";
import {
  parseCronExpression,
  type CronExplanation,
} from "@/app/_utils/parser-utils";
import { unwrapCommand } from "@/app/_utils/wrapper-utils-client";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { copyToClipboard } from "@/app/_utils/global-utils";

interface MinimalCronJobItemProps {
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
}

export const MinimalCronJobItem = ({
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
}: MinimalCronJobItemProps) => {
  const [cronExplanation, setCronExplanation] =
    useState<CronExplanation | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [commandCopied, setCommandCopied] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations();
  const displayCommand = unwrapCommand(job.command);

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
        <CodeIcon className="h-3 w-3" />
      ),
      onClick: () => onToggleLogging(job.id),
    },
    ...(job.logsEnabled
      ? [
        {
          label: t("cronjobs.viewLogs"),
          icon: <CodeIcon className="h-3 w-3" />,
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
      className={`tui-card p-3 terminal-font transition-colors ${isDropdownOpen ? "relative z-10" : ""
        }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 flex-shrink-0">
          {scheduleDisplayMode === "cron" && (
            <code className="text-xs bg-background0 text-status-warning px-1.5 py-0.5 terminal-font ascii-border">
              {job.schedule}
            </code>
          )}
          {scheduleDisplayMode === "human" && cronExplanation?.isValid && (
            <div className="flex items-center gap-1 ascii-border bg-background2 px-1.5 py-0.5">
              <InfoIcon className="h-3 w-3 flex-shrink-0" />
              <span className="text-xs italic truncate max-w-32">
                {cronExplanation.humanReadable}
              </span>
            </div>
          )}
          {scheduleDisplayMode === "both" && (
            <div className="flex items-center gap-1">
              <code className="text-xs bg-background0 text-status-warning px-1 py-0.5 terminal-font ascii-border">
                {job.schedule}
              </code>
              {cronExplanation?.isValid && (
                <div
                  className="flex items-center gap-1 ascii-border bg-background0 px-1 py-0.5 cursor-help"
                  title={cronExplanation.humanReadable}
                >
                  <InfoIcon className="h-2.5 w-2.5 flex-shrink-0" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {commandCopied === job.id && (
              <CheckIcon className="h-3 w-3 text-status-success flex-shrink-0" />
            )}
            <pre
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(unwrapCommand(job.command));
                setCommandCopied(job.id);
                setTimeout(() => setCommandCopied(null), 3000);
              }}
              className="flex-1 cursor-pointer overflow-hidden text-sm font-medium terminal-font bg-background1 px-2 py-1 ascii-border truncate"
              title={unwrapCommand(job.command)}
            >
              {unwrapCommand(displayCommand)}
            </pre>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {job.logsEnabled && (
            <div
              className="w-2 h-2 bg-status-info ascii-border"
              title={t("cronjobs.logged")}
            />
          )}
          {job.paused && (
            <div
              className="w-2 h-2 bg-status-warning ascii-border"
              title={t("cronjobs.paused")}
            />
          )}
          {!job.logError?.hasError && job.logsEnabled && (
            <div
              className="w-2 h-2 bg-status-success ascii-border"
              title={t("cronjobs.healthy")}
            />
          )}
          {job.logsEnabled && job.logError?.hasError && (
            <div
              className="w-2 h-2 bg-status-error ascii-border cursor-pointer"
              title="Latest execution failed - Click to view error log"
              onClick={(e) => {
                e.stopPropagation();
                onViewLogs(job);
              }}
            />
          )}
          {!job.logsEnabled && errors.length > 0 && (
            <div
              className="w-2 h-2 bg-status-warning ascii-border cursor-pointer"
              title={`${errors.length} error(s)`}
              onClick={(e) => onErrorClick(errors[0])}
            />
          )}
        </div>

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

          <DropdownMenu
            items={dropdownMenuItems}
            onOpenChange={setIsDropdownOpen}
          />
        </div>
      </div>
    </div>
  );
};
