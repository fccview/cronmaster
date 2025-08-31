"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  Trash2,
  Clock,
  Edit,
  Plus,
  Files,
  User,
  Play,
  Pause,
  Code,
} from "lucide-react";
import { CronJob } from "@/app/_utils/system";
import {
  removeCronJob,
  editCronJob,
  createCronJob,
  cloneCronJob,
  pauseCronJobAction,
  resumeCronJobAction,
  runCronJob,
} from "@/app/_server/actions/cronjobs";
import { useState, useMemo, useEffect } from "react";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { EditTaskModal } from "./modals/EditTaskModal";
import { DeleteTaskModal } from "./modals/DeleteTaskModal";
import { CloneTaskModal } from "./modals/CloneTaskModal";
import { UserFilter } from "./ui/UserFilter";
import { type Script } from "@/app/_server/actions/scripts";
import { showToast } from "./ui/Toast";

interface CronJobListProps {
  cronJobs: CronJob[];
  scripts: Script[];
}

export const CronJobList = ({ cronJobs, scripts }: CronJobListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewCronModalOpen, setIsNewCronModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null);
  const [jobToClone, setJobToClone] = useState<CronJob | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("selectedCronUser");
    if (savedUser) {
      setSelectedUser(savedUser);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem("selectedCronUser", selectedUser);
    } else {
      localStorage.removeItem("selectedCronUser");
    }
  }, [selectedUser]);

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
    user: "",
  });

  const filteredJobs = useMemo(() => {
    if (!selectedUser) return cronJobs;
    return cronJobs.filter((job) => job.user === selectedUser);
  }, [cronJobs, selectedUser]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await removeCronJob(id);
      if (result.success) {
        showToast("success", "Cron job deleted successfully");
      } else {
        showToast("error", "Failed to delete cron job", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Failed to delete cron job",
        "Please try again later."
      );
    } finally {
      setDeletingId(null);
      setIsDeleteModalOpen(false);
      setJobToDelete(null);
    }
  };

  const handleClone = async (newComment: string) => {
    if (!jobToClone) return;

    setIsCloning(true);
    try {
      const result = await cloneCronJob(jobToClone.id, newComment);
      if (result.success) {
        setIsCloneModalOpen(false);
        setJobToClone(null);
        showToast("success", "Cron job cloned successfully");
      } else {
        showToast("error", "Failed to clone cron job", result.message);
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      const result = await pauseCronJobAction(id);
      if (result.success) {
        showToast("success", "Cron job paused successfully");
      } else {
        showToast("error", "Failed to pause cron job", result.message);
      }
    } catch (error) {
      showToast("error", "Failed to pause cron job", "Please try again later.");
    }
  };

  const handleResume = async (id: string) => {
    try {
      const result = await resumeCronJobAction(id);
      if (result.success) {
        showToast("success", "Cron job resumed successfully");
      } else {
        showToast("error", "Failed to resume cron job", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Failed to resume cron job",
        "Please try again later."
      );
    }
  };

  const handleRun = async (id: string) => {
    setRunningJobId(id);
    try {
      const result = await runCronJob(id);
      if (result.success) {
        showToast("success", "Cron job executed successfully");
      } else {
        showToast("error", "Failed to execute cron job", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Failed to execute cron job",
        "Please try again later."
      );
    } finally {
      setRunningJobId(null);
    }
  };

  const confirmDelete = (job: CronJob) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
  };

  const confirmClone = (job: CronJob) => {
    setJobToClone(job);
    setIsCloneModalOpen(true);
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
        showToast("success", "Cron job updated successfully");
      } else {
        showToast("error", "Failed to update cron job", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Failed to update cron job",
        "Please try again later."
      );
    }
  };

  const handleNewCronSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("schedule", newCronForm.schedule);
      formData.append("command", newCronForm.command);
      formData.append("comment", newCronForm.comment);
      formData.append("user", newCronForm.user);
      if (newCronForm.selectedScriptId) {
        formData.append("selectedScriptId", newCronForm.selectedScriptId);
      }

      const result = await createCronJob(formData);
      if (result.success) {
        setIsNewCronModalOpen(false);
        setNewCronForm({
          schedule: "",
          command: "",
          comment: "",
          selectedScriptId: null,
          user: "",
        });
        showToast("success", "Cron job created successfully");
      } else {
        showToast("error", "Failed to create cron job", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Failed to create cron job",
        "Please try again later."
      );
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
                  {filteredJobs.length} of {cronJobs.length} scheduled job
                  {filteredJobs.length !== 1 ? "s" : ""}
                  {selectedUser && ` for ${selectedUser}`}
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
          <div className="mb-4">
            <UserFilter
              selectedUser={selectedUser}
              onUserChange={setSelectedUser}
              className="w-full sm:w-64"
            />
          </div>

          {filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 brand-gradient">
                {selectedUser
                  ? `No tasks for user ${selectedUser}`
                  : "No scheduled tasks yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {selectedUser
                  ? `No scheduled tasks found for user ${selectedUser}. Try selecting a different user or create a new task.`
                  : "Create your first scheduled task to automate your system operations and boost productivity."}
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
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-card p-4 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0 order-2 lg:order-1">
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

                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{job.user}</span>
                        </div>
                        {job.paused && (
                          <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">
                            Paused
                          </span>
                        )}
                      </div>

                      {job.comment && (
                        <p
                          className="text-xs text-muted-foreground italic truncate"
                          title={job.comment}
                        >
                          {job.comment}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 order-1 lg:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRun(job.id)}
                        disabled={runningJobId === job.id || job.paused}
                        className="btn-outline h-8 px-3"
                        title="Run cron job manually"
                        aria-label="Run cron job manually"
                      >
                        {runningJobId === job.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Code className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(job)}
                        className="btn-outline h-8 px-3"
                        title="Edit cron job"
                        aria-label="Edit cron job"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmClone(job)}
                        className="btn-outline h-8 px-3"
                        title="Clone cron job"
                        aria-label="Clone cron job"
                      >
                        <Files className="h-3 w-3" />
                      </Button>
                      {job.paused ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResume(job.id)}
                          className="btn-outline h-8 px-3"
                          title="Resume cron job"
                          aria-label="Resume cron job"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePause(job.id)}
                          className="btn-outline h-8 px-3"
                          title="Pause cron job"
                          aria-label="Pause cron job"
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(job)}
                        disabled={deletingId === job.id}
                        className="btn-destructive h-8 px-3"
                        title="Delete cron job"
                        aria-label="Delete cron job"
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

      <CloneTaskModal
        cronJob={jobToClone}
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onConfirm={handleClone}
        isCloning={isCloning}
      />
    </>
  );
}
