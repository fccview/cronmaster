"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { FileText, AlertCircle, Trash2 } from "lucide-react";
import { Script } from "@/app/_utils/scriptScanner";

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
  if (!isOpen || !script) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Script" size="sm">
      <div className="space-y-3">
        <div className="bg-muted/30 rounded p-2 border border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                {script.name}
              </span>
            </div>

            {script.description && (
              <div className="flex items-start gap-2">
                <FileText className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground break-words italic">
                  {script.description}
                </p>
              </div>
            )}

            <div className="flex items-start gap-2">
              <FileText className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <code className="text-xs font-mono bg-muted/30 px-1 py-0.5 rounded border border-border/30">
                {script.filename}
              </code>
            </div>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive mb-0.5">
                This action cannot be undone
              </p>
              <p className="text-xs text-muted-foreground">
                The script will be permanently removed.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="btn-outline"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="btn-destructive"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Script
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
