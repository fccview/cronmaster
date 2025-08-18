"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { BashEditor } from "./BashEditor";
import { BashSnippetHelper } from "./BashSnippetHelper";
import { Plus, FileText, Edit, Trash2, Copy, Check } from "lucide-react";
import {
  createScript,
  updateScript,
  deleteScript,
  fetchScripts,
  type Script,
} from "@/app/_server/actions/scripts";

interface ScriptsManagerProps {
  scripts: Script[];
}

export function ScriptsManager({
  scripts: initialScripts,
}: ScriptsManagerProps) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newScript, setNewScript] = useState({
    name: "",
    description: "",
    content: "#!/bin/bash\n# Your script here\necho 'Hello World'",
  });

  // Refresh scripts when initialScripts changes
  useEffect(() => {
    setScripts(initialScripts);
  }, [initialScripts]);

  const refreshScripts = async () => {
    const freshScripts = await fetchScripts();
    setScripts(freshScripts);
  };

  const handleCreate = async () => {
    const formData = new FormData();
    formData.append("name", newScript.name);
    formData.append("description", newScript.description);
    formData.append("content", newScript.content);

    const result = await createScript(formData);
    if (result.success) {
      setIsCreateModalOpen(false);
      setNewScript({
        name: "",
        description: "",
        content: "#!/bin/bash\n# Your script here\necho 'Hello World'",
      });
      await refreshScripts();
    } else {
      alert(result.message);
    }
  };

  const handleEdit = (script: Script) => {
    setEditingScript(script);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingScript) return;

    const formData = new FormData();
    formData.append("id", editingScript.id);
    formData.append("name", editingScript.name);
    formData.append("description", editingScript.description);
    formData.append("content", editingScript.content);

    const result = await updateScript(formData);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingScript(null);
      await refreshScripts();
    } else {
      alert(result.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this script?")) {
      const result = await deleteScript(id);
      if (result.success) {
        await refreshScripts();
      } else {
        alert(result.message);
      }
    }
  };

  const handleCopy = async (script: Script) => {
    await navigator.clipboard.writeText(script.content);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertSnippet = (snippet: string) => {
    if (isCreateModalOpen) {
      setNewScript((prev) => ({ ...prev, content: snippet }));
    } else if (isEditModalOpen && editingScript) {
      setEditingScript((prev) => (prev ? { ...prev, content: snippet } : null));
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
                    {/* Main Content */}
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
                      <pre className="text-xs bg-muted/30 p-2 rounded border border-border/30 overflow-x-auto max-h-20">
                        {script.content.split("\n")[0]}...
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(script)}
                        className="btn-outline h-8 px-3"
                      >
                        {copiedId === script.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(script)}
                        className="btn-outline h-8 px-3"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(script.id)}
                        className="btn-destructive h-8 px-3"
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

      {/* Create Script Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Script"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Script Name
              </label>
              <input
                type="text"
                value={newScript.name}
                onChange={(e) =>
                  setNewScript((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="My Script"
                className="w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <input
                type="text"
                value={newScript.description}
                onChange={(e) =>
                  setNewScript((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="What does this script do?"
                className="w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Script Content
            </label>
            <BashEditor
              value={newScript.content}
              onChange={(value) =>
                setNewScript((prev) => ({ ...prev, content: value }))
              }
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
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              className="btn-primary glow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Script
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Script Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Script"
        size="xl"
      >
        {editingScript && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Script Name
                </label>
                <input
                  type="text"
                  value={editingScript.name}
                  onChange={(e) =>
                    setEditingScript((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  placeholder="My Script"
                  className="w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingScript.description}
                  onChange={(e) =>
                    setEditingScript((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  placeholder="What does this script do?"
                  className="w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Script Content
              </label>
              <BashEditor
                value={editingScript.content}
                onChange={(value) =>
                  setEditingScript((prev) =>
                    prev ? { ...prev, content: value } : null
                  )
                }
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
                onClick={() => setIsEditModalOpen(false)}
                className="btn-outline"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                className="btn-primary glow-primary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Script
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
