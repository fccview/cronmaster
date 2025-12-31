"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { CronExpressionHelper } from "@/app/_components/FeatureComponents/Scripts/CronExpressionHelper";
import { PencilSimpleIcon, TerminalIcon, FileArrowDownIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  form: {
    schedule: string;
    command: string;
    comment: string;
    logsEnabled: boolean;
  };
  onFormChange: (updates: Partial<EditTaskModalProps["form"]>) => void;
}

export const EditTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
}: EditTaskModalProps) => {
  const t = useTranslations();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("cronjobs.editScheduledTask")}
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Schedule
          </label>
          <CronExpressionHelper
            value={form.schedule}
            onChange={(value) => onFormChange({ schedule: value })}
            placeholder="* * * * *"
            showPatterns={true}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Command
          </label>
          <div className="space-y-3">
            <div className="relative">
              <Input
                value={form.command}
                onChange={(e) => onFormChange({ command: e.target.value })}
                placeholder="/usr/bin/command"
                className="font-mono bg-muted/30 border-border focus:border-primary/50"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <TerminalIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t("common.description")}{" "}
            <span className="text-muted-foreground">
              ({t("common.optional")})
            </span>
          </label>
          <Input
            value={form.comment}
            onChange={(e) => onFormChange({ comment: e.target.value })}
            placeholder={t("cronjobs.whatDoesThisTaskDo")}
            className="bg-muted/30 border-border focus:border-primary/50"
          />
        </div>

        <div className="border border-border bg-muted/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="logsEnabled"
              checked={form.logsEnabled}
              onChange={(e) => onFormChange({ logsEnabled: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
            <div className="flex-1">
              <label
                htmlFor="logsEnabled"
                className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"
              >
                <FileArrowDownIcon className="h-4 w-4 text-primary" />
                {t("cronjobs.enableLogging")}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("cronjobs.loggingDescription")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </Button>
          <Button type="submit" className="btn-primary glow-primary">
            <PencilSimpleIcon className="h-4 w-4 mr-2" />
            Update Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
