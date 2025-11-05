"use client";

import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Clock, Plus } from "lucide-react";

interface CronJobEmptyStateProps {
    selectedUser: string | null;
    onNewTaskClick: () => void;
}

export const CronJobEmptyState = ({
    selectedUser,
    onNewTaskClick,
}: CronJobEmptyStateProps) => {
    return (
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
                onClick={onNewTaskClick}
                className="btn-primary glow-primary"
                size="lg"
            >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Task
            </Button>
        </div>
    );
};