"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Copy as CopyIcon,
  CheckCircle,
  Files,
} from "lucide-react";
import { type Script } from "@/app/_server/actions/scripts";
import {
  createScript,
  updateScript,
  deleteScript,
  cloneScript,
  getScriptContent,
} from "@/app/_server/actions/scripts";
import { CreateScriptModal } from "./modals/CreateScriptModal";
import { EditScriptModal } from "./modals/EditScriptModal";
import { DeleteScriptModal } from "./modals/DeleteScriptModal";
import { CloneScriptModal } from "./modals/CloneScriptModal";
import { showToast } from "./ui/Toast";

interface ScriptsManagerProps {
  scripts: Script[];
}

export function ScriptsManager({
  scripts: initialScripts,
}: ScriptsManagerProps) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    content: "#!/bin/bash\n# Your script here\necho 'Hello World'",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    content: "",
  });

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
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl brand-gradient">
                  Scripts Library
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {scripts.length} saved script{scripts.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary glow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Script
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 brand-gradient">
                No scripts yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create reusable bash scripts to use in your scheduled tasks.
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary glow-primary"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Script
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="glass-card p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
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
                        File: {script.filename}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(script)}
                        className="btn-outline h-8 px-3"
                        title="Copy script content to clipboard"
                        aria-label="Copy script content to clipboard"
                      >
                        {copiedId === script.id ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
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
                        <Files className="h-3 w-3" />
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
                        title="Edit script"
                        aria-label="Edit script"
                      >
                        <Edit className="h-3 w-3" />
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
                        <Trash2 className="h-3 w-3" />
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
