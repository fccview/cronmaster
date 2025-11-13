"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !preventCloseOnClickOutside
      ) {
        const target = event.target as Element;
        const isClickingOnModal = target.closest('[data-modal="true"]');
        const isClickingOnBackdrop =
          target.classList.contains("modal-backdrop");

        if (isClickingOnBackdrop) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, preventCloseOnClickOutside]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      data-modal="true"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-backdrop" />

      <div
        ref={modalRef}
        className={cn(
          "relative w-full bg-card border border-border shadow-lg",
          "max-h-[85vh]",
          "sm:rounded-lg sm:max-h-[90vh] sm:w-full",
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {children}
        </div>
      </div>
    </div>
  );
};
