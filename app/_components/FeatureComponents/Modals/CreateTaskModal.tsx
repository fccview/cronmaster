"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Switch } from "@/app/_components/GlobalComponents/UIElements/Switch";
import { CronExpressionHelper } from "@/app/_components/FeatureComponents/Scripts/CronExpressionHelper";
import { ScriptCommandPicker } from "@/app/_components/FeatureComponents/Cronjobs/Parts/ScriptCommandPicker";
import { UserSwitcher } from "@/app/_components/FeatureComponents/User/UserSwitcher";
import { PlusIcon, FileArrowDownIcon } from "@phosphor-icons/react";
import { Script } from "@/app/_utils/scripts-utils";
import { useTranslations } from "next-intl";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  scripts: Script[];
  form: {
    schedule: string;
    command: string;
    comment: string;
    selectedScriptId: string | null;
    user: string;
    logsEnabled: boolean;
  };
  onFormChange: (updates: Partial<CreateTaskModalProps["form"]>) => void;
}

export const CreateTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  scripts,
  form,
  onFormChange,
}: CreateTaskModalProps) => {
  const t = useTranslations();

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("cronjobs.createNewScheduledTask")}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("common.user")}
            </label>
            <UserSwitcher
              selectedUser={form.user}
              onUserChange={(user: string) => onFormChange({ user })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("cronjobs.schedule")}
            </label>
            <CronExpressionHelper
              value={form.schedule}
              onChange={(value) => onFormChange({ schedule: value })}
              placeholder="* * * * *"
              showPatterns={true}
            />
          </div>

          <ScriptCommandPicker
            scripts={scripts}
            command={form.command}
            selectedScriptId={form.selectedScriptId}
            onChange={onFormChange}
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("common.description")}
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
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => onFormChange({ logsEnabled: !form.logsEnabled })}
            >
              <Switch
                checked={form.logsEnabled}
                onCheckedChange={(checked) =>
                  onFormChange({ logsEnabled: checked })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileArrowDownIcon className="h-4 w-4 text-primary" />
                  {t("cronjobs.enableLogging")}
                </div>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="btn-primary glow-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              {t("cronjobs.createTask")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
