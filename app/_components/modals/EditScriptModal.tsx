"use client";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { BashEditor } from "../BashEditor";
import { BashSnippetHelper } from "../BashSnippetHelper";
import { Edit } from "lucide-react";
import { type Script } from "@/app/_server/actions/scripts";
import { showToast } from "../ui/Toast";

interface EditScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    formData: FormData
  ) => Promise<{ success: boolean; message: string }>;
  script: Script | null;
  form: {
    name: string;
    description: string;
    content: string;
  };
  onFormChange: (updates: Partial<EditScriptModalProps["form"]>) => void;
}

export function EditScriptModal({
  isOpen,
  onClose,
  onSubmit,
  script,
  form,
  onFormChange,
}: EditScriptModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script) return;

    const formData = new FormData();
    formData.append("id", script.id);
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("content", form.content);

    const result = await onSubmit(formData);
    if (result.success) {
      onClose();
    } else {
      showToast("error", "Failed to update script", result.message);
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    onFormChange({ content: snippet });
  };

  if (!script) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Script" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Script Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="My Script"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <Input
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What does this script do?"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Script Content
          </label>
          <BashEditor
            value={form.content}
            onChange={(value) => onFormChange({ content: value })}
            placeholder="#!/bin/bash&#10;# Your script here&#10;echo 'Hello World'"
          />
        </div>

        <div>
          <BashSnippetHelper onInsertSnippet={handleInsertSnippet} />
        </div>

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
            Update Script
          </Button>
        </div>
      </form>
    </Modal>
  );
}
