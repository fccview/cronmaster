"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/GlobalComponents/Cards/Card";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Switch } from "@/app/_components/GlobalComponents/UIElements/Switch";
import {
  ClockIcon,
  PlusIcon,
  Archive,
  CaretDownIcon,
  CodeIcon,
  ChatTextIcon,
  GearIcon,
  CircleNotchIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { Script } from "@/app/_utils/scripts-utils";
import { UserFilter } from "@/app/_components/FeatureComponents/User/UserFilter";

import { useCronJobState } from "@/app/_hooks/useCronJobState";
import { CronJobItem } from "@/app/_components/FeatureComponents/Cronjobs/Parts/CronJobItem";
import { MinimalCronJobItem } from "@/app/_components/FeatureComponents/Cronjobs/Parts/MinimalCronJobItem";
import { CronJobEmptyState } from "@/app/_components/FeatureComponents/Cronjobs/Parts/CronJobEmptyState";
import { CronJobListModals } from "@/app/_components/FeatureComponents/Modals/CronJobListsModals";
import { LogsModal } from "@/app/_components/FeatureComponents/Modals/LogsModal";
import { LiveLogModal } from "@/app/_components/FeatureComponents/Modals/LiveLogModal";
import { RestoreBackupModal } from "@/app/_components/FeatureComponents/Modals/RestoreBackupModal";
import { FiltersModal } from "@/app/_components/FeatureComponents/Modals/FiltersModal";
import { useTranslations } from "next-intl";
import { useSSEContext } from "@/app/_contexts/SSEContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchBackupFiles,
  restoreCronJob,
  deleteBackup,
  backupAllCronJobs,
  restoreAllCronJobs,
} from "@/app/_server/actions/cronjobs";
import { showToast } from "@/app/_components/GlobalComponents/UIElements/Toast";

interface CronJobListProps {
  cronJobs: CronJob[];
  scripts: Script[];
}

export const CronJobList = ({ cronJobs, scripts }: CronJobListProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { subscribe } = useSSEContext();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupFiles, setBackupFiles] = useState<
    Array<{
      filename: string;
      job: CronJob;
      backedUpAt: string;
    }>
  >([]);
  const [scheduleDisplayMode, setScheduleDisplayMode] = useState<
    "cron" | "human" | "both"
  >("both");
  const [loadedSettings, setLoadedSettings] = useState<boolean>(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [minimalMode, setMinimalMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    try {
      const savedScheduleMode = localStorage.getItem(
        "cronjob-schedule-display-mode"
      );
      if (
        savedScheduleMode === "cron" ||
        savedScheduleMode === "human" ||
        savedScheduleMode === "both"
      ) {
        setScheduleDisplayMode(savedScheduleMode);
      }

      const savedMinimalMode = localStorage.getItem("cronjob-minimal-mode");
      if (savedMinimalMode === "true") {
        setMinimalMode(true);
      }

      setLoadedSettings(true);
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === "job-completed" || event.type === "job-failed") {
        router.refresh();
      }
    });

    return unsubscribe;
  }, [subscribe, router]);

  useEffect(() => {
    if (!isClient) return;

    try {
      localStorage.setItem(
        "cronjob-schedule-display-mode",
        scheduleDisplayMode
      );
    } catch (error) {
      console.warn(
        "Failed to save schedule display mode to localStorage:",
        error
      );
    }
  }, [scheduleDisplayMode, isClient]);

  useEffect(() => {
    if (!isClient) return;

    try {
      localStorage.setItem("cronjob-minimal-mode", minimalMode.toString());
    } catch (error) {
      console.warn("Failed to save minimal mode to localStorage:", error);
    }
  }, [minimalMode, isClient]);

  const loadBackupFiles = async () => {
    const backups = await fetchBackupFiles();
    setBackupFiles(backups);
  };

  const handleRestore = async (filename: string) => {
    const result = await restoreCronJob(filename);
    if (result.success) {
      showToast("success", t("cronjobs.restoreJobSuccess"));
      router.refresh();
      loadBackupFiles();
    } else {
      showToast("error", t("cronjobs.restoreJobFailed"), result.message);
    }
  };

  const handleRestoreAll = async () => {
    const result = await restoreAllCronJobs();
    if (result.success) {
      showToast("success", result.message);
      router.refresh();
      setIsBackupModalOpen(false);
    } else {
      showToast("error", "Failed to restore all jobs", result.message);
    }
  };

  const handleBackupAll = async () => {
    const result = await backupAllCronJobs();
    if (result.success) {
      showToast("success", result.message);
      loadBackupFiles();
    } else {
      showToast("error", t("cronjobs.backupAllFailed"), result.message);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    const result = await deleteBackup(filename);
    if (result.success) {
      showToast("success", t("cronjobs.backupDeleted"));
      loadBackupFiles();
    } else {
      showToast("error", "Failed to delete backup", result.message);
    }
  };

  const {
    deletingId,
    runningJobId,
    selectedUser,
    setSelectedUser,
    jobErrors,
    errorModalOpen,
    setErrorModalOpen,
    selectedError,
    setSelectedError,
    isLogsModalOpen,
    setIsLogsModalOpen,
    jobForLogs,
    isLiveLogModalOpen,
    setIsLiveLogModalOpen,
    liveLogRunId,
    liveLogJobId,
    liveLogJobComment,
    filteredJobs,
    isNewCronModalOpen,
    setIsNewCronModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isCloneModalOpen,
    setIsCloneModalOpen,
    jobToDelete,
    jobToClone,
    isCloning,
    editForm,
    setEditForm,
    newCronForm,
    setNewCronForm,
    handleErrorClickLocal,
    refreshJobErrorsLocal,
    handleDeleteLocal,
    handleCloneLocal,
    handlePauseLocal,
    handleResumeLocal,
    handleRunLocal,
    handleToggleLoggingLocal,
    handleViewLogs,
    confirmDelete,
    confirmClone,
    handleEdit,
    handleEditSubmitLocal,
    handleNewCronSubmitLocal,
    handleBackupLocal,
  } = useCronJobState({ cronJobs, scripts });

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClockIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl brand-gradient">
                  {t("cronjobs.scheduledTasks")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("cronjobs.nOfNJObs", {
                    filtered: filteredJobs.length,
                    total: cronJobs.length,
                  })}{" "}
                  {selectedUser &&
                    t("cronjobs.forUser", { user: selectedUser })}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full justify-between sm:w-auto">
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsFiltersModalOpen(true)}
                  variant="outline"
                  className="btn-outline"
                  title={t("cronjobs.filters")}
                >
                  <FunnelIcon className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setIsBackupModalOpen(true)}
                  variant="outline"
                  className="btn-outline"
                  title={t("cronjobs.backups")}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={() => setIsNewCronModalOpen(true)}
                className="btn-primary glow-primary"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t("cronjobs.newTask")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label
                className="text-sm font-medium text-foreground cursor-pointer"
                onClick={() => setMinimalMode(!minimalMode)}
              >
                {t("cronjobs.minimalMode")}
              </label>
              <Switch checked={minimalMode} onCheckedChange={setMinimalMode} />
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <CronJobEmptyState
              selectedUser={selectedUser}
              onNewTaskClick={() => setIsNewCronModalOpen(true)}
            />
          ) : (
            <div className="space-y-4 max-h-[55vh] min-h-[55vh] overflow-y-auto tui-scrollbar">
              {loadedSettings ? (
                filteredJobs.map((job) =>
                  minimalMode ? (
                    <MinimalCronJobItem
                      key={job.id}
                      job={job}
                      errors={jobErrors[job.id] || []}
                      runningJobId={runningJobId}
                      deletingId={deletingId}
                      scheduleDisplayMode={scheduleDisplayMode}
                      onRun={handleRunLocal}
                      onEdit={handleEdit}
                      onClone={confirmClone}
                      onResume={handleResumeLocal}
                      onPause={handlePauseLocal}
                      onToggleLogging={handleToggleLoggingLocal}
                      onViewLogs={handleViewLogs}
                      onDelete={confirmDelete}
                      onBackup={handleBackupLocal}
                      onErrorClick={handleErrorClickLocal}
                    />
                  ) : (
                    <CronJobItem
                      key={job.id}
                      job={job}
                      errors={jobErrors[job.id] || []}
                      runningJobId={runningJobId}
                      deletingId={deletingId}
                      scheduleDisplayMode={scheduleDisplayMode}
                      onRun={handleRunLocal}
                      onEdit={handleEdit}
                      onClone={confirmClone}
                      onResume={handleResumeLocal}
                      onPause={handlePauseLocal}
                      onToggleLogging={handleToggleLoggingLocal}
                      onViewLogs={handleViewLogs}
                      onDelete={confirmDelete}
                      onBackup={handleBackupLocal}
                      onErrorClick={handleErrorClickLocal}
                      onErrorDismiss={refreshJobErrorsLocal}
                    />
                  )
                )
              ) : (
                <div className="flex items-center justify-center h-full min-h-[55vh]">
                  <CircleNotchIcon className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CronJobListModals
        cronJobs={cronJobs}
        scripts={scripts}
        isNewCronModalOpen={isNewCronModalOpen}
        onNewCronModalClose={() => setIsNewCronModalOpen(false)}
        onNewCronSubmit={handleNewCronSubmitLocal}
        newCronForm={newCronForm}
        onNewCronFormChange={(updates) =>
          setNewCronForm((prev) => ({ ...prev, ...updates }))
        }
        isEditModalOpen={isEditModalOpen}
        onEditModalClose={() => setIsEditModalOpen(false)}
        onEditSubmit={handleEditSubmitLocal}
        editForm={editForm}
        onEditFormChange={(updates) =>
          setEditForm((prev) => ({ ...prev, ...updates }))
        }
        isDeleteModalOpen={isDeleteModalOpen}
        onDeleteModalClose={() => setIsDeleteModalOpen(false)}
        onDeleteConfirm={() =>
          jobToDelete ? handleDeleteLocal(jobToDelete.id) : undefined
        }
        jobToDelete={jobToDelete}
        isCloneModalOpen={isCloneModalOpen}
        onCloneModalClose={() => setIsCloneModalOpen(false)}
        onCloneConfirm={handleCloneLocal}
        jobToClone={jobToClone}
        isCloning={isCloning}
        isErrorModalOpen={errorModalOpen}
        onErrorModalClose={() => {
          setErrorModalOpen(false);
          setSelectedError(null);
        }}
        selectedError={selectedError}
      />

      {jobForLogs && (
        <LogsModal
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
          jobId={jobForLogs.id}
          jobComment={jobForLogs.comment}
          preSelectedLog={jobForLogs.logError?.lastFailedLog}
        />
      )}

      <LiveLogModal
        isOpen={isLiveLogModalOpen}
        onClose={() => setIsLiveLogModalOpen(false)}
        runId={liveLogRunId}
        jobId={liveLogJobId}
        jobComment={liveLogJobComment}
      />

      <RestoreBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        backups={backupFiles}
        onRestore={handleRestore}
        onRestoreAll={handleRestoreAll}
        onBackupAll={handleBackupAll}
        onDelete={handleDeleteBackup}
        onRefresh={loadBackupFiles}
      />

      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
        scheduleDisplayMode={scheduleDisplayMode}
        onScheduleDisplayModeChange={setScheduleDisplayMode}
      />
    </>
  );
};
