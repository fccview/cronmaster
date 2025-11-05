"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/GlobalComponents/Cards/Card";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
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
import { useState, useMemo, useEffect } from "react";
import { CreateTaskModal } from "@/app/_components/FeatureComponents/Modals/CreateTaskModal";
import { EditTaskModal } from "@/app/_components/FeatureComponents/Modals/EditTaskModal";
import { DeleteTaskModal } from "@/app/_components/FeatureComponents/Modals/DeleteTaskModal";
import { CloneTaskModal } from "@/app/_components/FeatureComponents/Modals/CloneTaskModal";
import { UserFilter } from "@/app/_components/FeatureComponents/User/UserFilter";
import { ErrorBadge } from "@/app/_components/GlobalComponents/Badges/ErrorBadge";
import { ErrorDetailsModal } from "@/app/_components/FeatureComponents/Modals/ErrorDetailsModal";
import { Script } from "@/app/_utils/scriptScanner";

import {
  getJobErrorsByJobId,
  JobError,
} from "@/app/_utils/errorState";
import {
  handleErrorClick,
  handleDelete,
  handleClone,
  handlePause,
  handleResume,
  handleRun,
  handleEditSubmit,
  handleNewCronSubmit,
} from "@/app/_components/FeatureComponents/Cronjobs/helpers";

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
  const [jobErrors, setJobErrors] = useState<Record<string, JobError[]>>({});
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<JobError | null>(null);

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

  useEffect(() => {
    const errors: Record<string, JobError[]> = {};
    filteredJobs.forEach((job) => {
      errors[job.id] = getJobErrorsByJobId(job.id);
    });
    setJobErrors(errors);
  }, [filteredJobs]);

  const handleErrorClickLocal = (error: JobError) => {
    handleErrorClick(error, setSelectedError, setErrorModalOpen);
  };

  const refreshJobErrorsLocal = () => {
    const errors: Record<string, JobError[]> = {};
    filteredJobs.forEach((job) => {
      errors[job.id] = getJobErrorsByJobId(job.id);
    });
    setJobErrors(errors);
  };

  const handleDeleteLocal = async (id: string) => {
    await handleDelete(id, {
      setDeletingId,
      setIsDeleteModalOpen,
      setJobToDelete,
      setIsCloneModalOpen,
      setJobToClone,
      setIsCloning,
      setIsEditModalOpen,
      setEditingJob,
      setIsNewCronModalOpen,
      setNewCronForm,
      setRunningJobId,
      refreshJobErrors: refreshJobErrorsLocal,
      jobToClone,
      editingJob,
      editForm,
      newCronForm,
    });
  };

  const handleCloneLocal = async (newComment: string) => {
    await handleClone(newComment, {
      setDeletingId,
      setIsDeleteModalOpen,
      setJobToDelete,
      setIsCloneModalOpen,
      setJobToClone,
      setIsCloning,
      setIsEditModalOpen,
      setEditingJob,
      setIsNewCronModalOpen,
      setNewCronForm,
      setRunningJobId,
      refreshJobErrors: refreshJobErrorsLocal,
      jobToClone,
      editingJob,
      editForm,
      newCronForm,
    });
  };

  const handlePauseLocal = async (id: string) => {
    await handlePause(id);
  };

  const handleResumeLocal = async (id: string) => {
    await handleResume(id);
  };

  const handleRunLocal = async (id: string) => {
    await handleRun(id, {
      setDeletingId,
      setIsDeleteModalOpen,
      setJobToDelete,
      setIsCloneModalOpen,
      setJobToClone,
      setIsCloning,
      setIsEditModalOpen,
      setEditingJob,
      setIsNewCronModalOpen,
      setNewCronForm,
      setRunningJobId,
      refreshJobErrors: refreshJobErrorsLocal,
      jobToClone,
      editingJob,
      editForm,
      newCronForm,
    });
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

  const handleEditSubmitLocal = async (e: React.FormEvent) => {
    await handleEditSubmit(e, {
      setDeletingId,
      setIsDeleteModalOpen,
      setJobToDelete,
      setIsCloneModalOpen,
      setJobToClone,
      setIsCloning,
      setIsEditModalOpen,
      setEditingJob,
      setIsNewCronModalOpen,
      setNewCronForm,
      setRunningJobId,
      refreshJobErrors: refreshJobErrorsLocal,
      jobToClone,
      editingJob,
      editForm,
      newCronForm,
    });
  };

  const handleNewCronSubmitLocal = async (e: React.FormEvent) => {
    await handleNewCronSubmit(e, {
      setDeletingId,
      setIsDeleteModalOpen,
      setJobToDelete,
      setIsCloneModalOpen,
      setJobToClone,
      setIsCloning,
      setIsEditModalOpen,
      setEditingJob,
      setIsNewCronModalOpen,
      setNewCronForm,
      setRunningJobId,
      refreshJobErrors: refreshJobErrorsLocal,
      jobToClone,
      editingJob,
      editForm,
      newCronForm,
    });
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
                        <ErrorBadge
                          errors={jobErrors[job.id] || []}
                          onErrorClick={handleErrorClickLocal}
                          onErrorDismiss={refreshJobErrorsLocal}
                        />
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
                        onClick={() => handleRunLocal(job.id)}
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
                          onClick={() => handleResumeLocal(job.id)}
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
                          onClick={() => handlePauseLocal(job.id)}
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
        onSubmit={handleNewCronSubmitLocal}
        scripts={scripts}
        form={newCronForm}
        onFormChange={(updates) =>
          setNewCronForm((prev) => ({ ...prev, ...updates }))
        }
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmitLocal}
        form={editForm}
        onFormChange={(updates) =>
          setEditForm((prev) => ({ ...prev, ...updates }))
        }
      />

      <DeleteTaskModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() =>
          jobToDelete ? handleDeleteLocal(jobToDelete.id) : undefined
        }
        job={jobToDelete}
      />

      <CloneTaskModal
        cronJob={jobToClone}
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onConfirm={handleCloneLocal}
        isCloning={isCloning}
      />

      {errorModalOpen && selectedError && (
        <ErrorDetailsModal
          isOpen={errorModalOpen}
          onClose={() => {
            setErrorModalOpen(false);
            setSelectedError(null);
          }}
          error={{
            title: selectedError.title,
            message: selectedError.message,
            details: selectedError.details,
            command: selectedError.command,
            output: selectedError.output,
            stderr: selectedError.stderr,
            timestamp: selectedError.timestamp,
            jobId: selectedError.jobId,
          }}
        />
      )}
    </>
  );
};
