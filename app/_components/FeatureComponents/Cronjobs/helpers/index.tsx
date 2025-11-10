import { JobError, setJobError } from "@/app/_utils/error-utils";
import { showToast } from "@/app/_components/GlobalComponents/UIElements/Toast";
import {
  removeCronJob,
  editCronJob,
  createCronJob,
  cloneCronJob,
  pauseCronJobAction,
  resumeCronJobAction,
  runCronJob,
  toggleCronJobLogging,
} from "@/app/_server/actions/cronjobs";
import { CronJob } from "@/app/_utils/cronjob-utils";

interface HandlerProps {
  setDeletingId: (id: string | null) => void;
  setIsDeleteModalOpen: (open: boolean) => void;
  setJobToDelete: (job: CronJob | null) => void;
  setIsCloneModalOpen: (open: boolean) => void;
  setJobToClone: (job: CronJob | null) => void;
  setIsCloning: (cloning: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setEditingJob: (job: CronJob | null) => void;
  setIsNewCronModalOpen: (open: boolean) => void;
  setNewCronForm: (form: any) => void;
  setRunningJobId: (id: string | null) => void;
  refreshJobErrors: () => void;
  jobToClone: CronJob | null;
  editingJob: CronJob | null;
  editForm: {
    schedule: string;
    command: string;
    comment: string;
    logsEnabled: boolean;
  };
  newCronForm: {
    schedule: string;
    command: string;
    comment: string;
    selectedScriptId: string | null;
    user: string;
    logsEnabled: boolean;
  };
}

export const handleErrorClick = (
  error: JobError,
  setSelectedError: (error: JobError | null) => void,
  setErrorModalOpen: (open: boolean) => void
) => {
  setSelectedError(error);
  setErrorModalOpen(true);
};

export const refreshJobErrors = (
  filteredJobs: CronJob[],
  getJobErrorsByJobId: (jobId: string) => JobError[],
  setJobErrors: (errors: Record<string, JobError[]>) => void
) => {
  const errors: Record<string, JobError[]> = {};
  filteredJobs.forEach((job) => {
    errors[job.id] = getJobErrorsByJobId(job.id);
  });
  setJobErrors(errors);
};

export const handleDelete = async (id: string, props: HandlerProps) => {
  const {
    setDeletingId,
    setIsDeleteModalOpen,
    setJobToDelete,
    refreshJobErrors,
  } = props;

  setDeletingId(id);
  try {
    const result = await removeCronJob(id);
    if (result.success) {
      showToast("success", "Cron job deleted successfully");
    } else {
      const errorId = `delete-${id}-${Date.now()}`;
      const jobError: JobError = {
        id: errorId,
        title: "Failed to delete cron job",
        message: result.message,
        timestamp: new Date().toISOString(),
        jobId: id,
      };
      setJobError(jobError);
      refreshJobErrors();
      showToast(
        "error",
        "Failed to delete cron job",
        result.message,
        undefined,
        {
          title: jobError.title,
          message: jobError.message,
          timestamp: jobError.timestamp,
          jobId: jobError.jobId,
        }
      );
    }
  } catch (error: any) {
    const errorId = `delete-${id}-${Date.now()}`;
    const jobError: JobError = {
      id: errorId,
      title: "Failed to delete cron job",
      message: error.message || "Please try again later.",
      details: error.stack,
      timestamp: new Date().toISOString(),
      jobId: id,
    };
    setJobError(jobError);
    showToast(
      "error",
      "Failed to delete cron job",
      "Please try again later.",
      undefined,
      {
        title: jobError.title,
        message: jobError.message,
        details: jobError.details,
        timestamp: jobError.timestamp,
        jobId: jobError.jobId,
      }
    );
  } finally {
    setDeletingId(null);
    setIsDeleteModalOpen(false);
    setJobToDelete(null);
  }
};

export const handleClone = async (newComment: string, props: HandlerProps) => {
  const { jobToClone, setIsCloneModalOpen, setJobToClone, setIsCloning } =
    props;

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

export const handlePause = async (id: string) => {
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

export const handleToggleLogging = async (id: string) => {
  try {
    const result = await toggleCronJobLogging(id);
    if (result.success) {
      showToast("success", result.message);
    } else {
      showToast("error", "Failed to toggle logging", result.message);
    }
  } catch (error: any) {
    console.error("Error toggling logging:", error);
    showToast("error", "Error toggling logging", error.message);
  }
};

export const handleResume = async (id: string) => {
  try {
    const result = await resumeCronJobAction(id);
    if (result.success) {
      showToast("success", "Cron job resumed successfully");
    } else {
      showToast("error", "Failed to resume cron job", result.message);
    }
  } catch (error) {
    showToast("error", "Failed to resume cron job", "Please try again later.");
  }
};

export const handleRun = async (id: string, props: HandlerProps) => {
  const { setRunningJobId, refreshJobErrors } = props;

  setRunningJobId(id);
  try {
    const result = await runCronJob(id);
    if (result.success) {
      showToast("success", "Cron job executed successfully");
    } else {
      const errorId = `run-${id}-${Date.now()}`;
      const jobError: JobError = {
        id: errorId,
        title: "Failed to execute cron job",
        message: result.message,
        output: result.output,
        timestamp: new Date().toISOString(),
        jobId: id,
      };
      setJobError(jobError);
      refreshJobErrors();
      showToast(
        "error",
        "Failed to execute cron job",
        result.message,
        undefined,
        {
          title: jobError.title,
          message: jobError.message,
          output: jobError.output,
          timestamp: jobError.timestamp,
          jobId: jobError.jobId,
        }
      );
    }
  } catch (error: any) {
    const errorId = `run-${id}-${Date.now()}`;
    const jobError: JobError = {
      id: errorId,
      title: "Failed to execute cron job",
      message: error.message || "Please try again later.",
      details: error.stack,
      timestamp: new Date().toISOString(),
      jobId: id,
    };
    setJobError(jobError);
    refreshJobErrors();
    showToast(
      "error",
      "Failed to execute cron job",
      "Please try again later.",
      undefined,
      {
        title: jobError.title,
        message: jobError.message,
        details: jobError.details,
        timestamp: jobError.timestamp,
        jobId: jobError.jobId,
      }
    );
  } finally {
    setRunningJobId(null);
  }
};

export const handleEditSubmit = async (
  e: React.FormEvent,
  props: HandlerProps
) => {
  const {
    editingJob,
    editForm,
    setIsEditModalOpen,
    setEditingJob,
    refreshJobErrors,
  } = props;

  e.preventDefault();
  if (!editingJob) return;

  try {
    const formData = new FormData();
    formData.append("id", editingJob.id);
    formData.append("schedule", editForm.schedule);
    formData.append("command", editForm.command);
    formData.append("comment", editForm.comment);
    formData.append("logsEnabled", editForm.logsEnabled.toString());

    const result = await editCronJob(formData);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingJob(null);
      showToast("success", "Cron job updated successfully");
    } else {
      const errorId = `edit-${editingJob.id}-${Date.now()}`;
      const jobError: JobError = {
        id: errorId,
        title: "Failed to update cron job",
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString(),
        jobId: editingJob.id,
      };
      setJobError(jobError);
      refreshJobErrors();
      showToast(
        "error",
        "Failed to update cron job",
        result.message,
        undefined,
        {
          title: jobError.title,
          message: jobError.message,
          details: jobError.details,
          timestamp: jobError.timestamp,
          jobId: jobError.jobId,
        }
      );
    }
  } catch (error: any) {
    const errorId = `edit-${editingJob?.id || "unknown"}-${Date.now()}`;
    const jobError: JobError = {
      id: errorId,
      title: "Failed to update cron job",
      message: error.message || "Please try again later.",
      details: error.stack,
      timestamp: new Date().toISOString(),
      jobId: editingJob?.id || "unknown",
    };
    setJobError(jobError);
    refreshJobErrors();
    showToast(
      "error",
      "Failed to update cron job",
      "Please try again later.",
      undefined,
      {
        title: jobError.title,
        message: jobError.message,
        details: jobError.details,
        timestamp: jobError.timestamp,
        jobId: jobError.jobId,
      }
    );
  }
};

export const handleNewCronSubmit = async (
  e: React.FormEvent,
  props: HandlerProps
) => {
  const { newCronForm, setIsNewCronModalOpen, setNewCronForm } = props;

  e.preventDefault();

  try {
    const formData = new FormData();
    formData.append("schedule", newCronForm.schedule);
    formData.append("command", newCronForm.command);
    formData.append("comment", newCronForm.comment);
    formData.append("user", newCronForm.user);
    formData.append("logsEnabled", newCronForm.logsEnabled.toString());
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
        logsEnabled: false,
      });
      showToast("success", "Cron job created successfully");
    } else {
      showToast("error", "Failed to create cron job", result.message);
    }
  } catch (error) {
    showToast("error", "Failed to create cron job", "Please try again later.");
  }
};
