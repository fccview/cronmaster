"use client";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CronExpressionHelper } from "../CronExpressionHelper";
import { Plus, Terminal, FileText } from "lucide-react";

interface Script {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  scripts: Script[];
  form: {
    schedule: string;
    command: string;
    comment: string;
    selectedScriptId: string | null;
  };
  onFormChange: (updates: Partial<CreateTaskModalProps["form"]>) => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  scripts,
  form,
  onFormChange,
}: CreateTaskModalProps) {
  const selectedScript = scripts.find((s) => s.id === form.selectedScriptId);

  const handleScriptSelect = (script: Script) => {
    onFormChange({
      selectedScriptId: script.id,
      command: script.content,
    });
  };

  const handleCustomCommand = () => {
    onFormChange({
      selectedScriptId: null,
      command: "",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Scheduled Task"
      size="lg"
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

        {/* Task Type Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Task Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCustomCommand}
              className={`p-4 rounded-lg border-2 transition-all ${
                !form.selectedScriptId
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Custom Command</div>
                  <div className="text-xs opacity-70">Single command</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onFormChange({
                  selectedScriptId:
                    form.selectedScriptId || scripts[0]?.id || null,
                })
              }
              className={`p-4 rounded-lg border-2 transition-all ${
                form.selectedScriptId
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Saved Script</div>
                  <div className="text-xs opacity-70">Select from library</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Script Selection */}
        {form.selectedScriptId && scripts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Script
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {scripts.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => handleScriptSelect(script)}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    form.selectedScriptId === script.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-border/60"
                  }`}
                >
                  <div className="font-medium text-sm">{script.name}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {script.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Command Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {form.selectedScriptId ? "Script Content" : "Command"}
          </label>
          <div className="relative">
            <textarea
              value={form.command}
              onChange={(e) => onFormChange({ command: e.target.value })}
              placeholder={
                form.selectedScriptId
                  ? "Script content will appear here..."
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
              Script content is read-only. Edit the script in the Scripts
              Library.
            </p>
          )}
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
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
