"use client";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { BashEditor } from "../BashEditor";
import { BashSnippetHelper } from "../BashSnippetHelper";
import { FileText, Code } from "lucide-react";
import { showToast } from "../ui/Toast";

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    formData: FormData
  ) => Promise<{ success: boolean; message: string }>;
  title: string;
  submitButtonText: string;
  submitButtonIcon: React.ReactNode;
  form: {
    name: string;
    description: string;
    content: string;
  };
  onFormChange: (updates: Partial<ScriptModalProps["form"]>) => void;
  additionalFormData?: Record<string, string>;
}

export const ScriptModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitButtonText,
  submitButtonIcon,
  form,
  onFormChange,
  additionalFormData = {},
}: ScriptModalProps) => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("error", "Validation Error", "Script name is required");
      return;
    }

    if (!form.content.trim()) {
      showToast("error", "Validation Error", "Script content is required");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("content", form.content.trim());

    Object.entries(additionalFormData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const result = await onSubmit(formData);
    if (result.success) {
      onClose();
    } else {
      showToast("error", `Failed to ${title.toLowerCase()}`, result.message);
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    onFormChange({ content: snippet });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Script Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="My Script"
              required
              className={
                !form.name.trim()
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Input
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What does this script do?"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <div className="lg:col-span-1 bg-muted/20 rounded-lg p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <Code className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Snippets</h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <BashSnippetHelper onInsertSnippet={handleInsertSnippet} />
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                Script Content <span className="text-red-500">*</span>
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <BashEditor
                value={form.content}
                onChange={(value) => onFormChange({ content: value })}
                placeholder="#!/bin/bash&#10;# Your script here&#10;echo 'Hello World'"
                className="h-full"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </Button>
          <Button type="submit" className="btn-primary glow-primary">
            {submitButtonIcon}
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
