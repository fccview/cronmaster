"use client";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CronExpressionHelper } from "../CronExpressionHelper";
import { BashSnippetHelper } from "../BashSnippetHelper";
import { Edit, Terminal } from "lucide-react";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    schedule: string;
    command: string;
    comment: string;
  };
  onFormChange: (updates: Partial<EditTaskModalProps["form"]>) => void;
}

export function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
}: EditTaskModalProps) {
  const handleInsertSnippet = (snippet: string) => {
    const currentContent = form.command;
    const newContent = currentContent
      ? `${currentContent}\n\n${snippet}`
      : snippet;
    onFormChange({ command: newContent });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Scheduled Task"
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Schedule */}
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

        {/* Command */}
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
                className="font-mono bg-muted/30 border-border/50 focus:border-primary/50"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Bash Snippets Helper */}
            <div className="bg-muted/20 rounded-lg border border-border/30 p-3">
              <h4 className="text-sm font-medium text-foreground mb-2">
                💡 Useful Bash Snippets
              </h4>
              <BashSnippetHelper onInsertSnippet={handleInsertSnippet} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description{" "}
            <span className="text-muted-foreground">(Optional)</span>
          </label>
          <Input
            value={form.comment}
            onChange={(e) => onFormChange({ comment: e.target.value })}
            placeholder="What does this task do?"
            className="bg-muted/30 border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </Button>
          <Button type="submit" className="btn-primary glow-primary">
            <Edit className="h-4 w-4 mr-2" />
            Update Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
