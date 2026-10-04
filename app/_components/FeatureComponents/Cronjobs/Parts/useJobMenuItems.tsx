"use client";

import {
  TrashIcon,
  PencilSimpleIcon,
  FilesIcon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  FileXIcon,
  FileTextIcon,
  FileArrowDownIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { CronJob } from "@/app/_utils/cronjob-utils";

interface JobMenuHandlers {
  onEdit: (job: CronJob) => void;
  onClone: (job: CronJob) => void;
  onResume: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (job: CronJob) => void;
  onToggleLogging: (id: string) => void;
  onViewLogs: (job: CronJob) => void;
  onBackup: (id: string) => void;
}

export const useJobMenuItems = (
  job: CronJob,
  deletingId: string | null,
  handlers: JobMenuHandlers
) => {
  const t = useTranslations();

  return [
    {
      label: t("cronjobs.editCronJob"),
      icon: <PencilSimpleIcon className="h-3 w-3" />,
      onClick: () => handlers.onEdit(job),
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
      onClick: () => handlers.onToggleLogging(job.id),
    },
    ...(job.logsEnabled
      ? [
        {
          label: t("cronjobs.viewLogs"),
          icon: <FileTextIcon className="h-3 w-3" />,
          onClick: () => handlers.onViewLogs(job),
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
      onClick: () =>
        job.paused ? handlers.onResume(job.id) : handlers.onPause(job.id),
    },
    {
      label: t("cronjobs.cloneCronJob"),
      icon: <FilesIcon className="h-3 w-3" />,
      onClick: () => handlers.onClone(job),
    },
    {
      label: t("cronjobs.backupJob"),
      icon: <DownloadIcon className="h-3 w-3" />,
      onClick: () => handlers.onBackup(job.id),
    },
    {
      label: t("cronjobs.deleteCronJob"),
      icon: <TrashIcon className="h-3 w-3" />,
      onClick: () => handlers.onDelete(job),
      variant: "destructive" as const,
      disabled: deletingId === job.id,
    },
  ];
};
