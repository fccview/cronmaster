"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { ErrorDetailsModal } from "@/app/_components/FeatureComponents/Modals/ErrorDetailsModal";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
  errorDetails?: {
    title: string;
    message: string;
    details?: string;
    command?: string;
    output?: string;
    stderr?: string;
    timestamp: string;
    jobId?: string;
  };
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
  onErrorClick?: (errorDetails: Toast["errorDetails"]) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyles = {
  success:
    "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
  error: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  info: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  warning:
    "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

export const Toast = ({ toast, onRemove, onErrorClick }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md transition-all duration-300 ease-in-out",
        toastStyles[toast.type],
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div
        className={`flex-1 min-w-0 ${toast.type === "error" && toast.errorDetails ? "cursor-pointer" : ""
          }`}
        onClick={() => {
          if (toast.type === "error" && toast.errorDetails && onErrorClick) {
            onErrorClick(toast.errorDetails);
          }
        }}
      >
        <h4 className="font-medium text-sm">{toast.title}</h4>
        {toast.message && (
          <p className="text-sm opacity-90 mt-1">{toast.message}</p>
        )}
        {toast.type === "error" && toast.errorDetails && (
          <p className="text-xs opacity-70 mt-1">Click for details</p>
        )}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<
    Toast["errorDetails"] | null
  >(null);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleErrorClick = (errorDetails: Toast["errorDetails"]) => {
    setSelectedError(errorDetails);
    setErrorModalOpen(true);
  };

  useEffect(() => {
    (window as any).showToast = addToast;
    return () => {
      delete (window as any).showToast;
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
            onErrorClick={handleErrorClick}
          />
        ))}
      </div>
      {errorModalOpen && (
        <ErrorDetailsModal
          isOpen={errorModalOpen}
          onClose={() => {
            setErrorModalOpen(false);
            setSelectedError(null);
          }}
          error={selectedError || null}
        />
      )}
    </>
  );
};

export const showToast = (
  type: Toast["type"],
  title: string,
  message?: string,
  duration?: number,
  errorDetails?: Toast["errorDetails"]
) => {
  if (typeof window !== "undefined" && (window as any).showToast) {
    (window as any).showToast({ type, title, message, duration, errorDetails });
  }
};
