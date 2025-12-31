"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { WarningIcon, XIcon } from "@phosphor-icons/react";

export const WrapperScriptWarning = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    const dismissed = localStorage.getItem("wrapper-warning-dismissed");
    if (dismissed === "true") {
      setIsLoading(false);
      return;
    }

    checkWrapperScriptModification();
  }, []);

  const checkWrapperScriptModification = async () => {
    try {
      const response = await fetch("/api/system/wrapper-check");
      if (response.ok) {
        const data = await response.json();
        setIsVisible(data.modified);
      }
    } catch (error) {
      console.error("Failed to check wrapper script:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissWarning = () => {
    setIsVisible(false);
    localStorage.setItem("wrapper-warning-dismissed", "true");
  };

  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <WarningIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">
              {t("warnings.wrapperScriptModified")}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
              {t("warnings.wrapperScriptModifiedDescription")}
            </p>
          </div>
        </div>
        <button
          onClick={dismissWarning}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors ml-4"
          aria-label="Dismiss warning"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
