"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Trash2, Clock, Edit, Plus } from "lucide-react";
import { CronJob } from "@/app/_utils/system";
import {
  removeCronJob,
  editCronJob,
  createCronJob,
} from "@/app/_server/actions/cronjobs";
import { useState } from "react";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { EditTaskModal } from "./modals/EditTaskModal";
import { DeleteTaskModal } from "./modals/DeleteTaskModal";
import { type Script } from "@/app/_server/actions/scripts";

interface CronJobListProps {
  cronJobs: CronJob[];
  scripts: Script[];
}

export function CronJobList({ cronJobs, scripts }: CronJobListProps) {
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
    selectedScriptId: null as string | null,
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
      formData.append("command", newCronForm.command);
      formData.append("comment", newCronForm.comment);

      const result = await createCronJob(formData);
      if (result.success) {
        setIsNewCronModalOpen(false);
        setNewCronForm({
          schedule: "",
          command: "",
          comment: "",
          selectedScriptId: null,
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
            <div className="space-y-3">
              {cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-card p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      {/* Schedule and Command Row */}
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded font-mono border border-purple-500/20">
                          {job.schedule}
                        </code>
                        <div className="flex-1 min-w-0">
                          <pre
                            className="text-sm font-medium text-foreground truncate bg-muted/30 px-2 py-1 rounded border border-border/30"
                            title={job.command}
                          >
                            {job.command}
                          </pre>
                        </div>
                      </div>

                      {/* Comment (if exists) */}
                      {job.comment && (
                        <p
                          className="text-xs text-muted-foreground italic truncate"
                          title={job.comment}
                        >
                          {job.comment}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(job)}
                        className="btn-outline h-8 px-3"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(job)}
                        disabled={deletingId === job.id}
                        className="btn-destructive h-8 px-3"
                      >
                        {deletingId === job.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isNewCronModalOpen}
        onClose={() => setIsNewCronModalOpen(false)}
        onSubmit={handleNewCronSubmit}
        scripts={scripts}
        form={newCronForm}
        onFormChange={(updates) =>
          setNewCronForm((prev) => ({ ...prev, ...updates }))
        }
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        form={editForm}
        onFormChange={(updates) =>
          setEditForm((prev) => ({ ...prev, ...updates }))
        }
      />

      <DeleteTaskModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() =>
          jobToDelete ? handleDelete(jobToDelete.id) : undefined
        }
        job={jobToDelete}
      />
    </>
  );
}
