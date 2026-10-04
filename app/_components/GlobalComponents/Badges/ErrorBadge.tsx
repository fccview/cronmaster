"use client";

import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { JobError, removeJobError } from "@/app/_utils/error-utils";
import { useTranslations } from "next-intl";

interface ErrorBadgeProps {
  errors: JobError[];
  onErrorClick: (error: JobError) => void;
  onErrorDismiss?: () => void;
}

export const ErrorBadge = ({
  errors,
  onErrorClick,
  onErrorDismiss,
}: ErrorBadgeProps) => {
  const t = useTranslations();
  if (errors.length === 0) return null;

  const handleDismissError = (errorId: string) => {
    removeJobError(errorId);
    onErrorDismiss?.();
  };

  return (
    <div className="flex items-center gap-1">
      {errors.map((error) => (
        <div key={error.id} className="flex items-center gap-1">
          <button
            onClick={() => onErrorClick(error)}
            className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded text-xs hover:bg-destructive/20 transition-colors"
            title={error.message}
          >
            <WarningCircleIcon className="h-3 w-3" />
            <span className="hidden sm:inline">{t("common.error")}</span>
          </button>
          <button
            onClick={() => handleDismissError(error.id)}
            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
            title={t("common.dismissError")}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
