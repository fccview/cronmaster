"use client";

import { Edit } from "lucide-react";
import { type Script } from "@/app/_server/actions/scripts";
import { ScriptModal } from "./ScriptModal";

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
  if (!script) return null;

  return (
    <ScriptModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Edit Script"
      submitButtonText="Update Script"
      submitButtonIcon={<Edit className="h-4 w-4 mr-2" />}
      form={form}
      onFormChange={onFormChange}
      additionalFormData={{ id: script.id }}
    />
  );
}
