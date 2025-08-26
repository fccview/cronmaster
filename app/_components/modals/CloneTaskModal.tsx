"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { type CronJob } from "@/app/_utils/system";

interface CloneTaskModalProps {
  cronJob: CronJob | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newComment: string) => void;
  isCloning: boolean;
}

export const CloneTaskModal = ({
  cronJob,
  isOpen,
  onClose,
  onConfirm,
  isCloning,
}: CloneTaskModalProps) => {
  const [newComment, setNewComment] = useState("");

  if (!isOpen || !cronJob) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newComment.trim()) {
      onConfirm(newComment.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clone Cron Job" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-foreground mb-2">
            {cronJob.comment}
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            Schedule: {cronJob.schedule}
          </p>
          <p className="text-xs text-muted-foreground">
            Command: {cronJob.command}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="newComment"
            className="text-sm font-medium text-foreground"
          >
            New Comment
          </label>
          <Input
            id="newComment"
            type="text"
            placeholder="Enter new comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isCloning}
            className="w-full"
            autoFocus
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCloning}
            className="flex-1 btn-outline"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isCloning || !newComment.trim()}
            className="flex-1 btn-primary"
          >
            {isCloning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cloning...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Clone Cron Job
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
