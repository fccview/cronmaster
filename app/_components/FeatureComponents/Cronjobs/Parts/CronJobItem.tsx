"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import {
    Trash2,
    Edit,
    Files,
    User,
    Play,
    Pause,
    Code,
    Info,
} from "lucide-react";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { JobError } from "@/app/_utils/error-utils";
import { ErrorBadge } from "@/app/_components/GlobalComponents/Badges/ErrorBadge";
import { parseCronExpression, type CronExplanation } from "@/app/_utils/parser-utils";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

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
    onErrorClick,
    onErrorDismiss,
}: CronJobItemProps) => {
    const [cronExplanation, setCronExplanation] = useState<CronExplanation | null>(null);
    const locale = useLocale();
    const t = useTranslations();

    useEffect(() => {
        if (job.schedule) {
            const explanation = parseCronExpression(job.schedule, locale);
            setCronExplanation(explanation);
        } else {
            setCronExplanation(null);
        }
    }, [job.schedule]);
    return (
        <div
            key={job.id}
            className="glass-card p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
        >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0 order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-2">
                        <code className="text-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded font-mono border border-purple-500/20">
                            {job.schedule}
                        </code>
                        <div className="flex-1 min-w-0">
                            <pre
                                className="text-sm font-medium text-foreground truncate bg-muted/30 px-2 py-1 rounded border border-border/30"
                                title={job.command}
                            >
                                {job.command}
                            </pre>
                        </div>
                    </div>

                    {cronExplanation?.isValid && (
                        <div className="flex items-start gap-1.5 mb-1">
                            <Info className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground italic">
                                {cronExplanation.humanReadable}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{job.user}</span>
                        </div>
                        {job.paused && (
                            <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">
                                {t("cronjobs.paused")}
                            </span>
                        )}
                        <ErrorBadge
                            errors={errors}
                            onErrorClick={onErrorClick}
                            onErrorDismiss={onErrorDismiss}
                        />
                    </div>

                    {job.comment && (
                        <p
                            className="text-xs text-muted-foreground italic truncate"
                            title={job.comment}
                        >
                            {job.comment}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 order-1 lg:order-2">
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
                        onClick={() => onEdit(job)}
                        className="btn-outline h-8 px-3"
                        title={t("cronjobs.editCronJob")}
                        aria-label={t("cronjobs.editCronJob")}
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onClone(job)}
                        className="btn-outline h-8 px-3"
                        title={t("cronjobs.cloneCronJob")}
                        aria-label={t("cronjobs.cloneCronJob")}
                    >
                        <Files className="h-3 w-3" />
                    </Button>
                    {job.paused ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResume(job.id)}
                            className="btn-outline h-8 px-3"
                            title={t("cronjobs.resumeCronJob")}
                            aria-label={t("cronjobs.resumeCronJob")}
                        >
                            <Play className="h-3 w-3" />
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPause(job.id)}
                            className="btn-outline h-8 px-3"
                            title={t("cronjobs.pauseCronJob")}
                            aria-label={t("cronjobs.pauseCronJob")}
                        >
                            <Pause className="h-3 w-3" />
                        </Button>
                    )}
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(job)}
                        disabled={deletingId === job.id}
                        className="btn-destructive h-8 px-3"
                        title={t("cronjobs.deleteCronJob")}
                        aria-label={t("cronjobs.deleteCronJob")}
                    >
                        {deletingId === job.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};