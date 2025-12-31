"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/GlobalComponents/Cards/Card";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import {
  FileTextIcon,
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon,
  CopyIcon,
  CheckCircleIcon,
  FilesIcon,
} from "@phosphor-icons/react";
import { Script } from "@/app/_utils/scripts-utils";
import {
  createScript,
  updateScript,
  deleteScript,
  cloneScript,
  getScriptContent,
} from "@/app/_server/actions/scripts";
import { CreateScriptModal } from "@/app/_components/FeatureComponents/Modals/CreateScriptModal";
import { EditScriptModal } from "@/app/_components/FeatureComponents/Modals/EditScriptModal";
import { DeleteScriptModal } from "@/app/_components/FeatureComponents/Modals/DeleteScriptModal";
import { CloneScriptModal } from "@/app/_components/FeatureComponents/Modals/CloneScriptModal";
import { showToast } from "@/app/_components/GlobalComponents/UIElements/Toast";
import { useTranslations } from "next-intl";

interface ScriptsManagerProps {
  scripts: Script[];
}

const DRAFT_STORAGE_KEY = "cronjob_script_draft";

export const ScriptsManager = ({
  scripts: initialScripts,
}: ScriptsManagerProps) => {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const t = useTranslations();

  const defaultFormValues = {
    name: "",
    description: "",
    content: "#!/bin/bash\n# Your script here\necho 'Hello World'",
  };

  const [createForm, setCreateForm] = useState(defaultFormValues);

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    content: "",
  });

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        setCreateForm(parsedDraft);
      }
    } catch (error) {
      console.error("Failed to load draft from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createForm));
    } catch (error) {
      console.error("Failed to save draft to localStorage:", error);
    }
  }, [createForm]);

  const isDraft =
    createForm.name.trim() !== "" ||
    createForm.description.trim() !== "" ||
    createForm.content !== defaultFormValues.content;

  const handleClearDraft = () => {
    setCreateForm(defaultFormValues);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    showToast("success", t("scripts.draftCleared"));
  };

  const refreshScripts = async () => {
    try {
      const { fetchScripts } = await import("@/app/_server/actions/scripts");
      const freshScripts = await fetchScripts();
      setScripts(freshScripts);
    } catch (error) {
      console.error("Failed to refresh scripts:", error);
      showToast(
        "error",
        "Failed to refresh scripts",
        "Please try again later."
      );
    }
  };

  const handleCreate = async (formData: FormData) => {
    const result = await createScript(formData);
    if (result.success) {
      await refreshScripts();
      setIsCreateModalOpen(false);
      setCreateForm(defaultFormValues);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      showToast("success", "Script created successfully");
    } else {
      showToast("error", "Failed to create script", result.message);
    }
    return result;
  };

  const handleEdit = async (formData: FormData) => {
    const result = await updateScript(formData);
    if (result.success) {
      await refreshScripts();
      setIsEditModalOpen(false);
      setSelectedScript(null);
      showToast("success", "Script updated successfully");
    } else {
      showToast("error", "Failed to update script", result.message);
    }
    return result;
  };

  const handleDelete = async () => {
    if (!selectedScript) return;

    setIsDeleting(true);
    try {
      const result = await deleteScript(selectedScript.id);
      if (result.success) {
        await refreshScripts();
        setIsDeleteModalOpen(false);
        setSelectedScript(null);
        showToast("success", "Script deleted successfully");
      } else {
        showToast("error", "Failed to delete script", result.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClone = async (newName: string) => {
    if (!selectedScript) return;

    setIsCloning(true);
    try {
      const result = await cloneScript(selectedScript.id, newName);
      if (result.success) {
        await refreshScripts();
        setIsCloneModalOpen(false);
        setSelectedScript(null);
        showToast("success", "Script cloned successfully");
      } else {
        showToast("error", "Failed to clone script", result.message);
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handleCopy = async (script: Script) => {
    try {
      const content = await getScriptContent(script.filename);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopiedId(script.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast("success", "Script content copied to clipboard");
    } catch (error) {
      console.error("Failed to copy script content:", error);
      showToast("error", "Failed to copy script content");
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background2 ascii-border">
                <FileTextIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl brand-gradient">
                  {t("scripts.scriptsLibrary")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("scripts.nOfNSavedScripts", { count: scripts.length })}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary glow-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t("scripts.newScript")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <div className="text-center py-16 terminal-font">
              <div className="mx-auto w-20 h-20 bg-background2 ascii-border flex items-center justify-center mb-6">
                <FileTextIcon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 brand-gradient">
                {t("scripts.noScriptsYet")}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t("scripts.createReusableBashScripts")}
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary glow-primary"
                size="lg"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t("scripts.createYourFirstScript")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="glass-card p-4 ascii-border hover:bg-accent/30 transition-colors terminal-font"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-foreground truncate">
                          {script.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(script.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {script.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {script.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {t("scripts.file")}: {script.filename}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(script)}
                        className="btn-outline h-8 px-3"
                        title="CopyIcon script content to clipboard"
                        aria-label="CopyIcon script content to clipboard"
                      >
                        {copiedId === script.id ? (
                          <CheckCircleIcon className="h-3 w-3 text-status-success" />
                        ) : (
                          <CopyIcon className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedScript(script);
                          setIsCloneModalOpen(true);
                        }}
                        className="btn-outline h-8 px-3"
                        title="Clone script"
                        aria-label="Clone script"
                      >
                        <FilesIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setSelectedScript(script);
                          const content = await getScriptContent(
                            script.filename
                          );
                          setEditForm({
                            name: script.name,
                            description: script.description,
                            content: content,
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="btn-outline h-8 px-3"
                        title="PencilSimpleIcon script"
                        aria-label="PencilSimpleIcon script"
                      >
                        <PencilSimpleIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedScript(script);
                          setIsDeleteModalOpen(true);
                        }}
                        className="btn-destructive h-8 px-3"
                        title="Delete script"
                        aria-label="Delete script"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateScriptModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        form={createForm}
        onFormChange={(updates) =>
          setCreateForm((prev) => ({ ...prev, ...updates }))
        }
        isDraft={isDraft}
        onClearDraft={handleClearDraft}
      />

      <EditScriptModal
        script={selectedScript}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedScript(null);
        }}
        onSubmit={handleEdit}
        form={editForm}
        onFormChange={(updates) =>
          setEditForm((prev) => ({ ...prev, ...updates }))
        }
      />

      <DeleteScriptModal
        script={selectedScript}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedScript(null);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <CloneScriptModal
        script={selectedScript}
        isOpen={isCloneModalOpen}
        onClose={() => {
          setIsCloneModalOpen(false);
          setSelectedScript(null);
        }}
        onConfirm={handleClone}
        isCloning={isCloning}
      />
    </>
  );
}
