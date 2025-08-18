"use client";

import { Plus } from "lucide-react";
import { ScriptModal } from "./ScriptModal";

interface CreateScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    formData: FormData
  ) => Promise<{ success: boolean; message: string }>;
  form: {
    name: string;
    description: string;
    content: string;
  };
  onFormChange: (updates: Partial<CreateScriptModalProps["form"]>) => void;
}

export function CreateScriptModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
}: CreateScriptModalProps) {
  return (
    <ScriptModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Create New Script"
      submitButtonText="Create Script"
      submitButtonIcon={<Plus className="h-4 w-4 mr-2" />}
      form={form}
      onFormChange={onFormChange}
    />
  );
}
