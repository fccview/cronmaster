"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/GlobalComponents/Cards/Card";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Clock, Plus } from "lucide-react";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { Script } from "@/app/_utils/scripts-utils";
import { UserFilter } from "@/app/_components/FeatureComponents/User/UserFilter";

import { useCronJobState } from "@/app/_hooks/useCronJobState";
import { CronJobItem } from "@/app/_components/FeatureComponents/Cronjobs/Parts/CronJobItem";
import { CronJobEmptyState } from "@/app/_components/FeatureComponents/Cronjobs/Parts/CronJobEmptyState";
import { CronJobListModals } from "@/app/_components/FeatureComponents/Modals/CronJobListsModals";
import { LogsModal } from "@/app/_components/FeatureComponents/Modals/LogsModal";
import { useTranslations } from "next-intl";

interface CronJobListProps {
  cronJobs: CronJob[];
  scripts: Script[];
}

export const CronJobList = ({ cronJobs, scripts }: CronJobListProps) => {
  const t = useTranslations();
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
  } = useCronJobState({ cronJobs, scripts });

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
                  {t("cronjobs.scheduledTasks")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("cronjobs.nOfNJObs", { filtered: filteredJobs.length, total: cronJobs.length })}
                  {" "}
                  {selectedUser && t("cronjobs.forUser", { user: selectedUser })}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsNewCronModalOpen(true)}
              className="btn-primary glow-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("cronjobs.newTask")}
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
            <CronJobEmptyState
              selectedUser={selectedUser}
              onNewTaskClick={() => setIsNewCronModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <CronJobItem
                  key={job.id}
                  job={job}
                  errors={jobErrors[job.id] || []}
                  runningJobId={runningJobId}
                  deletingId={deletingId}
                  onRun={handleRunLocal}
                  onEdit={handleEdit}
                  onClone={confirmClone}
                  onResume={handleResumeLocal}
                  onPause={handlePauseLocal}
                  onToggleLogging={handleToggleLoggingLocal}
                  onViewLogs={handleViewLogs}
                  onDelete={confirmDelete}
                  onErrorClick={handleErrorClickLocal}
                  onErrorDismiss={refreshJobErrorsLocal}
                />
              ))}
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
        />
      )}
    </>
  );
};  