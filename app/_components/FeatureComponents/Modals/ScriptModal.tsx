"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { BashEditor } from "@/app/_components/FeatureComponents/Scripts/BashEditor";
import { BashSnippetHelper } from "@/app/_components/FeatureComponents/Scripts/BashSnippetHelper";
import { showToast } from "@/app/_components/GlobalComponents/UIElements/Toast";
import { FileTextIcon, CodeIcon, InfoIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

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
  isDraft?: boolean;
  onClearDraft?: () => void;
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
  isDraft = false,
  onClearDraft,
}: ScriptModalProps) => {
  const t = useTranslations();

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
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6 terminal-font">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Script Name <span className="text-status-error">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="My Script"
              required
              className={
                !form.name.trim()
                  ? "border-status-error focus:border-status-error"
                  : ""
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description{" "}
              <span className="text-xs opacity-60">(optional)</span>
            </label>
            <Input
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What does this script do?"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <div className="lg:col-span-1 bg-background0 ascii-border p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <CodeIcon className="h-4 w-4" />
              <h3 className="text-sm font-medium">Snippets</h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 !pr-0 tui-scrollbar">
              <BashSnippetHelper onInsertSnippet={handleInsertSnippet} />
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <FileTextIcon className="h-4 w-4" />
              <h3 className="text-sm font-medium">
                Script Content <span className="text-status-error">*</span>
              </h3>
              {isDraft && (
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-background0 text-status-info ascii-border">
                  {t("scripts.draft")}
                </span>
              )}
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

        <div className="flex justify-between items-center gap-3 pt-4 ascii-border border-t">
          <div>
            {isDraft && onClearDraft && (
              <Button
                type="button"
                variant="ghost"
                onClick={onClearDraft}
                className="opacity-60 hover:opacity-100"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {t("scripts.clearDraft")}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="btn-outline"
            >
              {t("scripts.close")}
            </Button>
            <Button type="submit" className="btn-primary glow-primary">
              {submitButtonIcon}
              {submitButtonText}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
