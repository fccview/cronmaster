"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { CronExpressionHelper } from "./CronExpressionHelper";
import { BashEditor } from "./BashEditor";
import {
  Trash2,
  Clock,
  Terminal,
  MessageSquare,
  Edit,
  Plus,
  Play,
  Pause,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { CronJob } from "@/app/_utils/system";
import {
  removeCronJob,
  editCronJob,
  createCronJob,
} from "@/app/_server/actions/cronjobs";
import { useState } from "react";

interface CronJobListProps {
  cronJobs: CronJob[];
}

export function CronJobList({ cronJobs }: CronJobListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewCronModalOpen, setIsNewCronModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null);
  const [editForm, setEditForm] = useState({
    schedule: "",
    command: "",
    comment: "",
  });
  const [newCronForm, setNewCronForm] = useState({
    schedule: "",
    command: "",
    comment: "",
    isScript: false,
    scriptContent: "",
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await removeCronJob(id);
      if (!result.success) {
        alert(result.message);
      }
    } catch (error) {
      alert("Failed to delete cron job");
    } finally {
      setDeletingId(null);
      setIsDeleteModalOpen(false);
      setJobToDelete(null);
    }
  };

  const confirmDelete = (job: CronJob) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setEditForm({
      schedule: job.schedule,
      command: job.command,
      comment: job.comment || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    try {
      const formData = new FormData();
      formData.append("id", editingJob.id);
      formData.append("schedule", editForm.schedule);
      formData.append("command", editForm.command);
      formData.append("comment", editForm.comment);

      const result = await editCronJob(formData);
      if (result.success) {
        setIsEditModalOpen(false);
        setEditingJob(null);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Failed to update cron job");
    }
  };

  const handleNewCronSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("schedule", newCronForm.schedule);

      if (newCronForm.isScript) {
        formData.append("command", `/app/scripts/${Date.now()}.sh`);
        formData.append("scriptContent", newCronForm.scriptContent);
      } else {
        formData.append("command", newCronForm.command);
      }

      formData.append("comment", newCronForm.comment);

      const result = await createCronJob(formData);
      if (result.success) {
        setIsNewCronModalOpen(false);
        setNewCronForm({
          schedule: "",
          command: "",
          comment: "",
          isScript: false,
          scriptContent: "",
        });
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Failed to create cron job");
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl brand-gradient">
                  Scheduled Tasks
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {cronJobs.length} scheduled job
                  {cronJobs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsNewCronModalOpen(true)}
              className="btn-primary glow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cronJobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 brand-gradient">
                No scheduled tasks yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first scheduled task to automate your system
                operations and boost productivity.
              </p>
              <Button
                onClick={() => setIsNewCronModalOpen(true)}
                className="btn-primary glow-primary"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-card p-4 lg:p-6 border border-border/50 rounded-xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Header with schedule */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-lg border border-purple-500/20 font-mono">
                          {job.schedule}
                        </code>
                      </div>

                      {/* Command */}
                      <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                        <div className="flex items-start gap-3">
                          <Terminal className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground break-words">
                              {job.command}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Comment */}
                      {job.comment && (
                        <div className="flex items-start gap-3 bg-orange-500/5 border border-orange-500/10 rounded-lg p-4">
                          <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-orange-700 dark:text-orange-300 break-words">
                              {job.comment}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(job)}
                        className="btn-outline"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(job)}
                        disabled={deletingId === job.id}
                        className="btn-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === job.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Scheduled Task"
        size="xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">
                Schedule (Cron Expression)
              </label>
              <CronExpressionHelper
                value={editForm.schedule}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, schedule: value }))
                }
                placeholder="* * * * *"
                showPatterns={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Command</label>
              <Input
                value={editForm.command}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, command: e.target.value }))
                }
                placeholder="/usr/bin/command"
                className="font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <Input
                value={editForm.comment}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="What does this task do?"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </Button>
            <Button type="submit" className="btn-primary glow-primary">
              Update Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Cron Modal */}
      <Modal
        isOpen={isNewCronModalOpen}
        onClose={() => setIsNewCronModalOpen(false)}
        title="Create New Scheduled Task"
        size="xl"
      >
        <form onSubmit={handleNewCronSubmit} className="space-y-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">
                Schedule (Cron Expression)
              </label>
              <CronExpressionHelper
                value={newCronForm.schedule}
                onChange={(value) =>
                  setNewCronForm((prev) => ({ ...prev, schedule: value }))
                }
                placeholder="* * * * *"
                showPatterns={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Task Type
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="taskType"
                    checked={!newCronForm.isScript}
                    onChange={() =>
                      setNewCronForm((prev) => ({ ...prev, isScript: false }))
                    }
                    className="text-primary"
                  />
                  <span>Command</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="taskType"
                    checked={newCronForm.isScript}
                    onChange={() =>
                      setNewCronForm((prev) => ({ ...prev, isScript: true }))
                    }
                    className="text-primary"
                  />
                  <span>Bash Script</span>
                </label>
              </div>
            </div>

            {!newCronForm.isScript ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Command
                </label>
                <Input
                  value={newCronForm.command}
                  onChange={(e) =>
                    setNewCronForm((prev) => ({
                      ...prev,
                      command: e.target.value,
                    }))
                  }
                  placeholder="/usr/bin/command"
                  className="font-mono"
                  required
                />
              </div>
            ) : (
              <div>
                <BashEditor
                  value={newCronForm.scriptContent}
                  onChange={(value) =>
                    setNewCronForm((prev) => ({
                      ...prev,
                      scriptContent: value,
                    }))
                  }
                  placeholder="#!/bin/bash\n# Your bash script here\necho 'Hello World'\n# Add your commands below"
                  label="Bash Script"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <Input
                value={newCronForm.comment}
                onChange={(e) =>
                  setNewCronForm((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
                placeholder="What does this task do?"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewCronModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </Button>
            <Button type="submit" className="btn-primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Scheduled Task"
        size="sm"
      >
        <div className="text-center">
          {jobToDelete && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm font-mono text-foreground">
                  {jobToDelete.schedule}
                </code>
              </div>
              <div className="flex items-start gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground break-words">
                  {jobToDelete.command}
                </p>
              </div>
              {jobToDelete.comment && (
                <div className="flex items-start gap-2 mt-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground break-words">
                    {jobToDelete.comment}
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-6">
            This action cannot be undone. The scheduled task will be permanently
            removed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn-outline"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                jobToDelete ? handleDelete(jobToDelete.id) : undefined
              }
              className="btn-destructive"
            >
              Delete Task
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
