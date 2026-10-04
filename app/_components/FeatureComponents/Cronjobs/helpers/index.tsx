import {
  JobError,
  getErrorMessage,
  getErrorStack,
  setJobError,
} from "@/app/_utils/error-utils";
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
  backupCronJob,
} from "@/app/_server/actions/cronjobs";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("ui:jobs");

type Translate = (
  key: string,
  values?: Record<string, string | number>
) => string;

interface HandlerProps {
  t: Translate;
  setDeletingId: (id: string | null) => void;
  setIsDeleteModalOpen: (open: boolean) => void;
  setJobToDelete: (job: CronJob | null) => void;
  setIsCloneModalOpen: (open: boolean) => void;
  setJobToClone: (job: CronJob | null) => void;
  setIsCloning: (cloning: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setEditingJob: (job: CronJob | null) => void;
  setIsNewCronModalOpen: (open: boolean) => void;
  setNewCronForm: (form: HandlerProps["newCronForm"]) => void;
  setRunningJobId: (id: string | null) => void;
  refreshJobErrors: () => void;
  setIsLiveLogModalOpen?: (open: boolean) => void;
  setLiveLogRunId?: (runId: string) => void;
  setLiveLogJobId?: (jobId: string) => void;
  setLiveLogJobComment?: (comment: string) => void;
  jobToClone: CronJob | null;
  editingJob: CronJob | null;
  editForm: {
    schedule: string;
    command: string;
    comment: string;
    selectedScriptId: string | null;
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

export const handleDelete = async (job: CronJob, props: HandlerProps) => {
  const {
    t,
    setDeletingId,
    setIsDeleteModalOpen,
    setJobToDelete,
    refreshJobErrors,
  } = props;

  setDeletingId(job.id);
  try {
    const result = await removeCronJob({
      id: job.id,
      schedule: job.schedule,
      command: job.command,
      comment: job.comment,
      user: job.user,
    });
    if (result.success) {
      showToast("success", t("cronjobs.jobDeleted"));
    } else {
      const errorId = `delete-${job.id}-${Date.now()}`;
      const jobError: JobError = {
        id: errorId,
        title: t("cronjobs.deleteJobFailed"),
        message: result.message,
        timestamp: new Date().toISOString(),
        jobId: job.id,
      };
      setJobError(jobError);
      refreshJobErrors();
      showToast(
        "error",
        t("cronjobs.deleteJobFailed"),
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
  } catch (error: unknown) {
    const errorId = `delete-${job.id}-${Date.now()}`;
    const jobError: JobError = {
      id: errorId,
      title: t("cronjobs.deleteJobFailed"),
      message: getErrorMessage(error) || t("common.tryAgainLater"),
      details: getErrorStack(error),
      timestamp: new Date().toISOString(),
      jobId: job.id,
    };
    setJobError(jobError);
    showToast(
      "error",
      t("cronjobs.deleteJobFailed"),
      t("common.tryAgainLater"),
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
  const { t, jobToClone, setIsCloneModalOpen, setJobToClone, setIsCloning } =
    props;

  if (!jobToClone) return;

  setIsCloning(true);
  try {
    const result = await cloneCronJob(jobToClone.id, newComment);
    if (result.success) {
      setIsCloneModalOpen(false);
      setJobToClone(null);
      showToast("success", t("cronjobs.jobCloned"));
    } else {
      showToast("error", t("cronjobs.cloneJobFailed"), result.message);
    }
  } finally {
    setIsCloning(false);
  }
};

export const handlePause = async (job: CronJob, t: Translate) => {
  try {
    const result = await pauseCronJobAction({
      id: job.id,
      schedule: job.schedule,
      command: job.command,
      comment: job.comment,
      user: job.user,
    });
    if (result.success) {
      showToast("success", t("cronjobs.jobPaused"));
    } else {
      showToast("error", t("cronjobs.pauseJobFailed"), result.message);
    }
  } catch {
    showToast("error", t("cronjobs.pauseJobFailed"), t("common.tryAgainLater"));
  }
};

export const handleToggleLogging = async (job: CronJob, t: Translate) => {
  try {
    const result = await toggleCronJobLogging({
      id: job.id,
      schedule: job.schedule,
      command: job.command,
      comment: job.comment,
      user: job.user,
      logsEnabled: job.logsEnabled,
    });
    if (result.success) {
      showToast(
        "success",
        t(job.logsEnabled ? "cronjobs.loggingDisabled" : "cronjobs.loggingEnabled")
      );
    } else {
      showToast("error", t("cronjobs.toggleLoggingFailed"), result.message);
    }
  } catch (error: unknown) {
    log.error("Error toggling logging", error);
    showToast("error", t("cronjobs.toggleLoggingFailed"), getErrorMessage(error));
  }
};

export const handleResume = async (job: CronJob, t: Translate) => {
  try {
    const result = await resumeCronJobAction({
      id: job.id,
      schedule: job.schedule,
      command: job.command,
      comment: job.comment,
      user: job.user,
    });
    if (result.success) {
      showToast("success", t("cronjobs.jobResumed"));
    } else {
      showToast("error", t("cronjobs.resumeJobFailed"), result.message);
    }
  } catch {
    showToast("error", t("cronjobs.resumeJobFailed"), t("common.tryAgainLater"));
  }
};

export const handleRun = async (id: string, props: HandlerProps, job: CronJob) => {
  const {
    t,
    setRunningJobId,
    refreshJobErrors,
    setIsLiveLogModalOpen,
    setLiveLogRunId,
    setLiveLogJobId,
    setLiveLogJobComment,
  } = props;

  setRunningJobId(id);
  try {
    const result = await runCronJob(id);
    if (result.success) {
      if (result.mode === "async" && result.runId) {
        if (setIsLiveLogModalOpen && setLiveLogRunId && setLiveLogJobId) {
          setLiveLogRunId(result.runId);
          setLiveLogJobId(id);
          if (setLiveLogJobComment) {
            setLiveLogJobComment(job.comment || "");
          }
          setIsLiveLogModalOpen(true);
        }
      } else {
        showToast("success", t("cronjobs.runCronJobSuccess"));
      }
    } else {
      const errorId = `run-${id}-${Date.now()}`;
      const jobError: JobError = {
        id: errorId,
        title: t("cronjobs.runCronJobFailed"),
        message: result.message,
        output: result.output,
        timestamp: new Date().toISOString(),
        jobId: id,
      };
      setJobError(jobError);
      refreshJobErrors();
      showToast(
        "error",
        t("cronjobs.runCronJobFailed"),
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
  } catch (error: unknown) {
    const errorId = `run-${id}-${Date.now()}`;
    const jobError: JobError = {
      id: errorId,
      title: t("cronjobs.runCronJobFailed"),
      message: getErrorMessage(error) || t("common.tryAgainLater"),
      details: getErrorStack(error),
      timestamp: new Date().toISOString(),
      jobId: id,
    };
    setJobError(jobError);
    refreshJobErrors();
    showToast(
      "error",
      t("cronjobs.runCronJobFailed"),
      t("common.tryAgainLater"),
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
    t,
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
    if (editForm.selectedScriptId) {
      formData.append("selectedScriptId", editForm.selectedScriptId);
    }

    const result = await editCronJob(formData);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingJob(null);
      showToast("success", t("cronjobs.jobUpdated"));
    } else {
      const errorId = `edit-${editingJob.id}-${Date.now()}`;
      const jobError: JobError = {
        id: errorId,
        title: t("cronjobs.updateJobFailed"),
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString(),
        jobId: editingJob.id,
      };
      setJobError(jobError);
      refreshJobErrors();
      showToast(
        "error",
        t("cronjobs.updateJobFailed"),
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
  } catch (error: unknown) {
    const errorId = `edit-${editingJob?.id || "unknown"}-${Date.now()}`;
    const jobError: JobError = {
      id: errorId,
      title: t("cronjobs.updateJobFailed"),
      message: getErrorMessage(error) || t("common.tryAgainLater"),
      details: getErrorStack(error),
      timestamp: new Date().toISOString(),
      jobId: editingJob?.id || "unknown",
    };
    setJobError(jobError);
    refreshJobErrors();
    showToast(
      "error",
      t("cronjobs.updateJobFailed"),
      t("common.tryAgainLater"),
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
  const { t, newCronForm, setIsNewCronModalOpen, setNewCronForm } = props;

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
      showToast("success", t("cronjobs.jobCreated"));
    } else {
      showToast("error", t("cronjobs.createJobFailed"), result.message);
    }
  } catch {
    showToast("error", t("cronjobs.createJobFailed"), t("common.tryAgainLater"));
  }
};

export const handleBackup = async (job: CronJob, t: Translate) => {
  try {
    const result = await backupCronJob(job);
    if (result.success) {
      showToast("success", t("cronjobs.backupJobSuccess"));
    } else {
      showToast("error", t("cronjobs.backupJobFailed"), result.message);
    }
  } catch (error: unknown) {
    log.error("Error backing up job", error);
    showToast("error", t("cronjobs.backupJobFailed"), getErrorMessage(error));
  }
};
