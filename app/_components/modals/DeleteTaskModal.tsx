"use client";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import {
  Calendar,
  Terminal,
  MessageSquare,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { CronJob } from "@/app/_utils/system";

interface DeleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  job: CronJob | null;
}

export function DeleteTaskModal({
  isOpen,
  onClose,
  onConfirm,
  job,
}: DeleteTaskModalProps) {
  if (!job) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Scheduled Task"
      size="sm"
    >
      <div className="space-y-3">
        {/* Task Preview */}
        <div className="bg-muted/30 rounded p-2 border border-border/50">
          <div className="space-y-1">
            {/* Schedule */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <code className="text-xs font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1 py-0.5 rounded border border-purple-500/20">
                {job.schedule}
              </code>
            </div>

            {/* Command */}
            <div className="flex items-start gap-2">
              <Terminal className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <pre className="text-xs font-medium text-foreground break-words bg-muted/30 px-1 py-0.5 rounded border border-border/30 flex-1">
                {job.command}
              </pre>
            </div>

            {/* Comment */}
            {job.comment && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground break-words italic">
                  {job.comment}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive mb-0.5">
                This action cannot be undone
              </p>
              <p className="text-xs text-muted-foreground">
                The task will be permanently removed.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" onClick={onClose} className="btn-outline">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="btn-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
