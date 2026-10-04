"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { FileTextIcon, WarningCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { Script } from "@/app/_utils/scripts-utils";
import { useTranslations } from "next-intl";

interface DeleteScriptModalProps {
  script: Script | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteScriptModal = ({
  script,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteScriptModalProps) => {
  const t = useTranslations();
  if (!isOpen || !script) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("scripts.deleteScript")} size="sm">
      <div className="space-y-3">
        <div className="bg-muted/30 rounded p-2 border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                {script.name}
              </span>
            </div>

            {script.description && (
              <div className="flex items-start gap-2">
                <FileTextIcon className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground break-words italic">
                  {script.description}
                </p>
              </div>
            )}

            <div className="flex items-start gap-2">
              <FileTextIcon className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <code className="text-xs font-mono bg-muted/30 px-1 py-0.5 rounded border border-border">
                {script.filename}
              </code>
            </div>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
          <div className="flex items-start gap-2">
            <WarningCircleIcon className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive mb-0.5">
                {t("common.actionCannotBeUndone")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("scripts.scriptWillBeRemoved")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="btn-outline"
            disabled={isDeleting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("common.deleting")}
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4 mr-2" />
                {t("scripts.deleteScript")}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
