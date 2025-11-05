"use client";

import { CreateTaskModal } from "@/app/_components/FeatureComponents/Modals/CreateTaskModal";
import { EditTaskModal } from "@/app/_components/FeatureComponents/Modals/EditTaskModal";
import { DeleteTaskModal } from "@/app/_components/FeatureComponents/Modals/DeleteTaskModal";
import { CloneTaskModal } from "@/app/_components/FeatureComponents/Modals/CloneTaskModal";
import { ErrorDetailsModal } from "@/app/_components/FeatureComponents/Modals/ErrorDetailsModal";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { Script } from "@/app/_utils/scripts-utils";
import { JobError } from "@/app/_utils/error-utils";

interface CronJobListModalsProps {
    cronJobs: CronJob[];
    scripts: Script[];

    isNewCronModalOpen: boolean;
    onNewCronModalClose: () => void;
    onNewCronSubmit: (e: React.FormEvent) => Promise<void>;
    newCronForm: any;
    onNewCronFormChange: (updates: any) => void;

    isEditModalOpen: boolean;
    onEditModalClose: () => void;
    onEditSubmit: (e: React.FormEvent) => Promise<void>;
    editForm: any;
    onEditFormChange: (updates: any) => void;

    isDeleteModalOpen: boolean;
    onDeleteModalClose: () => void;
    onDeleteConfirm: () => void;
    jobToDelete: CronJob | null;

    isCloneModalOpen: boolean;
    onCloneModalClose: () => void;
    onCloneConfirm: (newComment: string) => Promise<void>;
    jobToClone: CronJob | null;
    isCloning: boolean;

    isErrorModalOpen: boolean;
    onErrorModalClose: () => void;
    selectedError: JobError | null;
}

export const CronJobListModals = ({
    scripts,
    isNewCronModalOpen,
    onNewCronModalClose,
    onNewCronSubmit,
    newCronForm,
    onNewCronFormChange,
    isEditModalOpen,
    onEditModalClose,
    onEditSubmit,
    editForm,
    onEditFormChange,
    isDeleteModalOpen,
    onDeleteModalClose,
    onDeleteConfirm,
    jobToDelete,
    isCloneModalOpen,
    onCloneModalClose,
    onCloneConfirm,
    jobToClone,
    isCloning,
    isErrorModalOpen,
    onErrorModalClose,
    selectedError,
}: CronJobListModalsProps) => {
    return (
        <>
            <CreateTaskModal
                isOpen={isNewCronModalOpen}
                onClose={onNewCronModalClose}
                onSubmit={onNewCronSubmit}
                scripts={scripts}
                form={newCronForm}
                onFormChange={onNewCronFormChange}
            />

            <EditTaskModal
                isOpen={isEditModalOpen}
                onClose={onEditModalClose}
                onSubmit={onEditSubmit}
                form={editForm}
                onFormChange={onEditFormChange}
            />

            <DeleteTaskModal
                isOpen={isDeleteModalOpen}
                onClose={onDeleteModalClose}
                onConfirm={onDeleteConfirm}
                job={jobToDelete}
            />

            <CloneTaskModal
                cronJob={jobToClone}
                isOpen={isCloneModalOpen}
                onClose={onCloneModalClose}
                onConfirm={onCloneConfirm}
                isCloning={isCloning}
            />

            {isErrorModalOpen && selectedError && (
                <ErrorDetailsModal
                    isOpen={isErrorModalOpen}
                    onClose={onErrorModalClose}
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