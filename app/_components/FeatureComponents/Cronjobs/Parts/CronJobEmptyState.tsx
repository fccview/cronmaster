"use client";

import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { ClockIcon, PlusIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

interface CronJobEmptyStateProps {
    selectedUser: string | null;
    onNewTaskClick: () => void;
}

export const CronJobEmptyState = ({
    selectedUser,
    onNewTaskClick,
}: CronJobEmptyStateProps) => {
    const t = useTranslations();

    return (
        <div className="text-center py-16">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <ClockIcon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 brand-gradient">
                {selectedUser
                    ? t("cronjobs.noTasksForUser", { user: selectedUser })
                    : t("cronjobs.noScheduledTasksYet")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {selectedUser
                    ? t("cronjobs.noTasksForUserDescription", { user: selectedUser })
                    : t("cronjobs.createFirstTaskDescription")}
            </p>
            <Button
                onClick={onNewTaskClick}
                className="btn-primary glow-primary"
                size="lg"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t("cronjobs.createYourFirstTask")}
            </Button>
        </div>
    );
};