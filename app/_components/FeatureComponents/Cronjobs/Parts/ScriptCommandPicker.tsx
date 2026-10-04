"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { SelectScriptModal } from "@/app/_components/FeatureComponents/Modals/SelectScriptModal";
import { TerminalIcon, FileTextIcon, XIcon } from "@phosphor-icons/react";
import { getHostScriptPath } from "@/app/_server/actions/scripts";
import { Script } from "@/app/_utils/scripts-utils";
import { useTranslations } from "next-intl";

export interface ScriptCommandValue {
  command: string;
  selectedScriptId: string | null;
}

export const buildScriptSelection = async (
  script: Script
): Promise<ScriptCommandValue> => ({
  selectedScriptId: script.id,
  command: await getHostScriptPath(script.filename),
});

interface ScriptCommandPickerProps extends ScriptCommandValue {
  scripts: Script[];
  onChange: (updates: Partial<ScriptCommandValue>) => void;
}

export const ScriptCommandPicker = ({
  scripts,
  command,
  selectedScriptId,
  onChange,
}: ScriptCommandPickerProps) => {
  const [isSelectScriptModalOpen, setIsSelectScriptModalOpen] = useState(false);
  const selectedScript = scripts.find((s) => s.id === selectedScriptId);
  const t = useTranslations();

  const handleScriptSelect = async (script: Script) => {
    onChange(await buildScriptSelection(script));
  };

  const handleCustomCommand = () => {
    if (selectedScriptId) {
      onChange({ selectedScriptId: null });
    }
  };

  const handleClearScript = () => {
    onChange({ selectedScriptId: null, command: "" });
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t("cronjobs.taskType")}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCustomCommand}
            className={`p-4 rounded-lg transition-all ${
              !selectedScriptId
                ? "border-border border-2"
                : "border-border border"
            }`}
          >
            <div className="flex items-center gap-3">
              <TerminalIcon className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{t("cronjobs.customCommand")}</div>
                <div className="text-xs opacity-70">
                  {t("cronjobs.singleCommand")}
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsSelectScriptModalOpen(true)}
            className={`p-4 rounded-lg transition-all ${
              selectedScriptId
                ? "border-border border-2"
                : "border-border border"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileTextIcon className="h-5 w-5" />
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

      {selectedScriptId && selectedScript ? (
        <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileTextIcon className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-foreground">
                  {selectedScript.name}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedScript.description}
              </p>
              <div className="bg-muted/30 p-2 rounded border border-border">
                <code className="text-xs font-mono text-foreground break-all">
                  {command}
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
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t("cronjobs.command")}
          </label>
          <div className="relative">
            <textarea
              value={command}
              onChange={(e) => onChange({ command: e.target.value })}
              placeholder="/usr/bin/command"
              className="w-full h-24 p-2 border border-border rounded bg-background0 text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/20"
              required
            />
            <div className="absolute right-3 top-2">
              <TerminalIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {isSelectScriptModalOpen &&
        createPortal(
          <SelectScriptModal
            isOpen
            onClose={() => setIsSelectScriptModalOpen(false)}
            scripts={scripts}
            onScriptSelect={handleScriptSelect}
            selectedScriptId={selectedScriptId}
          />,
          document.body
        )}
    </>
  );
};
