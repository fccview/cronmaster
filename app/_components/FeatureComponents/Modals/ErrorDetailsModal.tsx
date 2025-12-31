"use client";

import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { AlertCircle, Copy, X } from "lucide-react";
import { showToast } from "@/app/_components/GlobalComponents/UIElements/Toast";

interface ErrorDetails {
  title: string;
  message: string;
  details?: string;
  command?: string;
  output?: string;
  stderr?: string;
  timestamp: string;
  jobId?: string;
}

interface ErrorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorDetails | null;
}

export const ErrorDetailsModal = ({
  isOpen,
  onClose,
  error,
}: ErrorDetailsModalProps) => {
  if (!isOpen || !error) return null;

  const handleCopyDetails = async () => {
    const detailsText = `
Error Details:
Title: ${error.title}
Message: ${error.message}
${error.details ? `Details: ${error.details}` : ""}
${error.command ? `Command: ${error.command}` : ""}
${error.output ? `Output: ${error.output}` : ""}
${error.stderr ? `Stderr: ${error.stderr}` : ""}
Timestamp: ${error.timestamp}
    `.trim();

    try {
      await navigator.clipboard.writeText(detailsText);
      showToast("success", "Error details copied to clipboard");
    } catch (err) {
      showToast("error", "Failed to copy error details");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Error Details" size="xl">
      <div className="space-y-4">
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-destructive mb-1">
                {error.title}
              </h3>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </div>

        {error.details && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Details
            </h4>
            <div className="bg-muted/30 p-3 rounded border border-border">
              <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words">
                {error.details}
              </pre>
            </div>
          </div>
        )}

        {error.command && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Command
            </h4>
            <div className="bg-muted/30 p-3 rounded border border-border">
              <code className="text-sm font-mono text-foreground break-all">
                {error.command}
              </code>
            </div>
          </div>
        )}

        {error.output && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Output</h4>
            <div className="bg-muted/30 p-3 rounded border border-border max-h-32 overflow-y-auto">
              <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                {error.output}
              </pre>
            </div>
          </div>
        )}

        {error.stderr && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Error Output
            </h4>
            <div className="bg-destructive/5 p-3 rounded border border-destructive/20 max-h-32 overflow-y-auto">
              <pre className="text-sm font-mono text-destructive whitespace-pre-wrap">
                {error.stderr}
              </pre>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Timestamp: {error.timestamp}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCopyDetails}
            className="btn-outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Details
          </Button>
          <Button onClick={onClose} className="btn-primary">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
