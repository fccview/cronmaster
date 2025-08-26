"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { type Script } from "@/app/_server/actions/scripts";

interface CloneScriptModalProps {
  script: Script | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  isCloning: boolean;
}

export const CloneScriptModal = ({
  script,
  isOpen,
  onClose,
  onConfirm,
  isCloning,
}: CloneScriptModalProps) => {
  const [newName, setNewName] = useState("");

  if (!isOpen || !script) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newName.trim()) {
      onConfirm(newName.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clone Script" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-foreground mb-2">{script.name}</h4>
          {script.description && (
            <p className="text-sm text-muted-foreground mb-2">
              {script.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            File: {script.filename}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="newName"
            className="text-sm font-medium text-foreground"
          >
            New Script Name
          </label>
          <Input
            id="newName"
            type="text"
            placeholder="Enter new script name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
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
            disabled={isCloning || !newName.trim()}
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
                Clone Script
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
