"use client";

import { useState, useMemo, useEffect } from "react";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { Script } from "@/app/_utils/scripts-utils";
import {
    getJobErrorsByJobId,
    JobError,
} from "@/app/_utils/error-utils";
import {
    handleErrorClick,
    handleDelete,
    handleClone,
    handlePause,
    handleResume,
    handleRun,
    handleEditSubmit,
    handleNewCronSubmit,
    handleToggleLogging,
    handleBackup,
} from "@/app/_components/FeatureComponents/Cronjobs/helpers";

interface CronJobListProps {
    cronJobs: CronJob[];
    scripts: Script[];
}

export const useCronJobState = ({ cronJobs, scripts }: CronJobListProps) => {
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
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [jobForLogs, setJobForLogs] = useState<CronJob | null>(null);
    const [isLiveLogModalOpen, setIsLiveLogModalOpen] = useState(false);
    const [liveLogRunId, setLiveLogRunId] = useState<string>("");
    const [liveLogJobId, setLiveLogJobId] = useState<string>("");
    const [liveLogJobComment, setLiveLogJobComment] = useState<string>("");

    const [editForm, setEditForm] = useState({
        schedule: "",
        command: "",
        comment: "",
        logsEnabled: false,
    });
    const [newCronForm, setNewCronForm] = useState({
        schedule: "",
        command: "",
        comment: "",
        selectedScriptId: null as string | null,
        user: "",
        logsEnabled: false,
    });

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


    const refreshJobErrorsLocal = () => {
        const errors: Record<string, JobError[]> = {};
        filteredJobs.forEach((job) => {
            errors[job.id] = getJobErrorsByJobId(job.id);
        });
        setJobErrors(errors);
    };

    const getHelperState = () => ({
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
        setIsLiveLogModalOpen,
        setLiveLogRunId,
        setLiveLogJobId,
        setLiveLogJobComment,
        jobToClone,
        editingJob,
        editForm,
        newCronForm,
    });

    const handleErrorClickLocal = (error: JobError) => {
        handleErrorClick(error, setSelectedError, setErrorModalOpen);
    };

    const handleDeleteLocal = async (id: string) => {
        await handleDelete(id, getHelperState());
    };

    const handleCloneLocal = async (newComment: string) => {
        await handleClone(newComment, getHelperState());
    };

    const handlePauseLocal = async (id: string) => {
        await handlePause(id);
    };

    const handleResumeLocal = async (id: string) => {
        await handleResume(id);
    };

    const handleRunLocal = async (id: string) => {
        const job = cronJobs.find(j => j.id === id);
        if (!job) return;
        await handleRun(id, getHelperState(), job);
    };

    const handleToggleLoggingLocal = async (id: string) => {
        await handleToggleLogging(id);
    };

    const handleViewLogs = (job: CronJob) => {
        setJobForLogs(job);
        setIsLogsModalOpen(true);
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
            logsEnabled: job.logsEnabled || false,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmitLocal = async (e: React.FormEvent) => {
        await handleEditSubmit(e, getHelperState());
    };

    const handleNewCronSubmitLocal = async (e: React.FormEvent) => {
        await handleNewCronSubmit(e, getHelperState());
    };

    const handleBackupLocal = async (id: string) => {
        await handleBackup(id);
    };

    return {
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
    };
};