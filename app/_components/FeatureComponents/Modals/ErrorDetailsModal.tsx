"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { WarningCircleIcon, CopyIcon } from "@phosphor-icons/react";
import { showToast } from "@/app/_components/GlobalComponents/UIElements/Toast";
import { LogViewer } from "@/app/_components/GlobalComponents/UIElements/LogViewer";
import { useTranslations } from "next-intl";

interface ErrorDetails {
  title: string;
  message: string;
  details?: string;
  command?: string;
  output?: string;
  stderr?: string;
  timestamp: string;
  jobId?: string;
}

interface ErrorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorDetails | null;
}

export const ErrorDetailsModal = ({
  isOpen,
  onClose,
  error,
}: ErrorDetailsModalProps) => {
  const t = useTranslations();
  if (!isOpen || !error) return null;

  const handleCopyDetails = async () => {
    const detailsText = `
Error Details:
Title: ${error.title}
Message: ${error.message}
${error.details ? `Details: ${error.details}` : ""}
${error.command ? `Command: ${error.command}` : ""}
${error.output ? `Output: ${error.output}` : ""}
${error.stderr ? `Stderr: ${error.stderr}` : ""}
Timestamp: ${error.timestamp}
    `.trim();

    try {
      await navigator.clipboard.writeText(detailsText);
      showToast("success", t("cronjobs.errorDetailsCopied"));
    } catch {
      showToast("error", t("cronjobs.copyErrorDetailsFailed"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("cronjobs.errorDetails")} size="xl">
      <div className="space-y-4">
        <div className="ascii-border border-status-error bg-background1 p-4">
          <div className="flex items-start gap-3">
            <WarningCircleIcon className="h-5 w-5 text-status-error mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-status-error mb-1">
                {error.title}
              </h3>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </div>

        {error.details && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              {t("common.details")}
            </h4>
            <div className="bg-background1 p-3 ascii-border">
              <pre className="text-sm whitespace-pre-wrap break-words">
                {error.details}
              </pre>
            </div>
          </div>
        )}

        {error.command && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              {t("cronjobs.command")}
            </h4>
            <div className="bg-background1 p-3 ascii-border">
              <code className="text-sm break-all">
                {error.command}
              </code>
            </div>
          </div>
        )}

        {error.output && (
          <LogViewer
            className="max-h-64"
            title={t("cronjobs.output")}
            content={error.output}
          />
        )}

        {error.stderr && (
          <LogViewer
            className="max-h-64 border-status-error"
            title={<span className="text-status-error">{t("cronjobs.errorOutput")}</span>}
            content={error.stderr}
          />
        )}

        <div className="text-xs text-muted-foreground">
          {t("cronjobs.timestamp")}: {error.timestamp}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={handleCopyDetails}>
            <CopyIcon className="h-4 w-4 mr-2" />
            {t("cronjobs.copyDetails")}
          </Button>
          <Button onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
