"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { ScriptModal } from "@/app/_components/FeatureComponents/Modals/ScriptModal";

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
  isDraft?: boolean;
  onClearDraft?: () => void;
}

export const CreateScriptModal = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
  isDraft,
  onClearDraft,
}: CreateScriptModalProps) => {
  return (
    <ScriptModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Create New Script"
      submitButtonText="Create Script"
      submitButtonIcon={<PlusIcon className="h-4 w-4 mr-2" />}
      form={form}
      onFormChange={onFormChange}
      isDraft={isDraft}
      onClearDraft={onClearDraft}
    />
  );
}
