"use client";

import { useEffect, useRef } from "react";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  showCloseButton?: boolean;
  preventCloseOnClickOutside?: boolean;
  className?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  preventCloseOnClickOutside = false,
  className = "",
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.close();
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  const sizeClasses = {
    sm: "w-[600px]",
    md: "w-[800px]",
    lg: "w-[1000px]",
    xl: "w-[1200px]",
    "2xl": "w-[1400px]",
    "3xl": "w-[90vw]",
  };

  return (
    <dialog
      ref={dialogRef}
      className={`ascii-border terminal-font bg-background0 ${sizeClasses[size]} max-w-[95vw] ${className}`}
      onClick={(e) => {
        if (e.target === dialogRef.current && !preventCloseOnClickOutside) {
          onClose();
        }
      }}
    >
      <div className="ascii-border border-t-0 border-l-0 border-r-0 p-4 flex justify-between items-center bg-background0">
        <h2 className="terminal-font font-bold uppercase">{title}</h2>
        {showCloseButton && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto tui-scrollbar bg-background0">
        {children}
      </div>
    </dialog>
  );
};
