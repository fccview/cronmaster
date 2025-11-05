"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { CronExpressionHelper } from "@/app/_components/FeatureComponents/Scripts/CronExpressionHelper";
import { SelectScriptModal } from "@/app/_components/FeatureComponents/Modals/SelectScriptModal";
import { UserSwitcher } from "@/app/_components/FeatureComponents/User/UserSwitcher";
import { Plus, Terminal, FileText, X } from "lucide-react";
import { getScriptContent } from "@/app/_server/actions/scripts";
import { getHostScriptPath } from "@/app/_server/actions/scripts";
import { useTranslations } from "next-intl";

interface Script {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  filename: string;
}

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
  const [selectedScriptContent, setSelectedScriptContent] =
    useState<string>("");
  const [isSelectScriptModalOpen, setIsSelectScriptModalOpen] = useState(false);
  const selectedScript = scripts.find((s) => s.id === form.selectedScriptId);
  const t = useTranslations();

  useEffect(() => {
    const loadScriptContent = async () => {
      if (selectedScript) {
        const content = await getScriptContent(selectedScript.filename);
        setSelectedScriptContent(content);
      } else {
        setSelectedScriptContent("");
      }
    };

    loadScriptContent();
  }, [selectedScript]);

  const handleScriptSelect = async (script: Script) => {
    onFormChange({
      selectedScriptId: script.id,
      command: await getHostScriptPath(script.filename),
    });
  };

  const handleCustomCommand = () => {
    onFormChange({
      selectedScriptId: null,
      command: "",
    });
  };

  const handleClearScript = () => {
    onFormChange({
      selectedScriptId: null,
      command: "",
    });
  };

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
              onUserChange={(user) => onFormChange({ user })}
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("cronjobs.taskType")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCustomCommand}
                className={`p-4 rounded-lg border-2 transition-all ${!form.selectedScriptId
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Terminal className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{t("cronjobs.customCommand")}</div>
                    <div className="text-xs opacity-70">{t("cronjobs.singleCommand")}</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsSelectScriptModalOpen(true)}
                className={`p-4 rounded-lg border-2 transition-all ${form.selectedScriptId
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{t("scripts.savedScript")}</div>
                    <div className="text-xs opacity-70">
                      {t("scripts.selectFromLibrary")}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {form.selectedScriptId && selectedScript && (
            <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-foreground">
                      {selectedScript.name}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedScript.description}
                  </p>
                  <div className="bg-muted/30 p-2 rounded border border-border/30">
                    <code className="text-xs font-mono text-foreground break-all">
                      {form.command}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectScriptModalOpen(true)}
                    className="h-8 px-2 text-xs"
                  >
                    {t("common.change")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearScript}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!form.selectedScriptId && !selectedScript && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("cronjobs.command")}
              </label>
              <div className="relative">
                <textarea
                  value={form.command}
                  onChange={(e) => onFormChange({ command: e.target.value })}
                  placeholder={
                    form.selectedScriptId
                      ? "/app/scripts/script_name.sh"
                      : "/usr/bin/command"
                  }
                  className="w-full h-24 p-2 border border-border rounded bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/20"
                  required
                  readOnly={!!form.selectedScriptId}
                />
                <div className="absolute right-3 top-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {form.selectedScriptId && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("scripts.scriptPathReadOnly")}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("common.description")}
              <span className="text-muted-foreground">({t("common.optional")})</span>
            </label>
            <Input
              value={form.comment}
              onChange={(e) => onFormChange({ comment: e.target.value })}
              placeholder={t("cronjobs.whatDoesThisTaskDo")}
              className="bg-muted/30 border-border/50 focus:border-primary/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="btn-outline"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="btn-primary glow-primary">
              <Plus className="h-4 w-4 mr-2" />
              {t("cronjobs.createTask")}
            </Button>
          </div>
        </form>
      </Modal>

      <SelectScriptModal
        isOpen={isSelectScriptModalOpen}
        onClose={() => setIsSelectScriptModalOpen(false)}
        scripts={scripts}
        onScriptSelect={handleScriptSelect}
        selectedScriptId={form.selectedScriptId}
      />
    </>
  );
}
