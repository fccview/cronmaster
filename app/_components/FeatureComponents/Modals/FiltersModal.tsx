"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { ChevronDown, Code, MessageSquare } from "lucide-react";
import { UserFilter } from "@/app/_components/FeatureComponents/User/UserFilter";
import { useTranslations } from "next-intl";

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: string | null;
  onUserChange: (user: string | null) => void;
  scheduleDisplayMode: "cron" | "human" | "both";
  onScheduleDisplayModeChange: (mode: "cron" | "human" | "both") => void;
}

export const FiltersModal = ({
  isOpen,
  onClose,
  selectedUser,
  onUserChange,
  scheduleDisplayMode,
  onScheduleDisplayModeChange,
}: FiltersModalProps) => {
  const t = useTranslations();
  const [localScheduleMode, setLocalScheduleMode] =
    useState(scheduleDisplayMode);
  const [isScheduleDropdownOpen, setIsScheduleDropdownOpen] = useState(false);

  useEffect(() => {
    setLocalScheduleMode(scheduleDisplayMode);
  }, [scheduleDisplayMode]);

  const handleSave = () => {
    onScheduleDisplayModeChange(localScheduleMode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("cronjobs.filtersAndDisplay")}
      size="md"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t("cronjobs.filterByUser")}
            </label>
            <UserFilter
              selectedUser={selectedUser}
              onUserChange={onUserChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t("cronjobs.scheduleDisplay")}
            </label>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() =>
                  setIsScheduleDropdownOpen(!isScheduleDropdownOpen)
                }
                className="btn-outline w-full justify-between"
              >
                <div className="flex items-center">
                  {localScheduleMode === "cron" && (
                    <Code className="h-4 w-4 mr-2" />
                  )}
                  {localScheduleMode === "human" && (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  {localScheduleMode === "both" && (
                    <>
                      <Code className="h-4 w-4 mr-1" />
                      <MessageSquare className="h-4 w-4 mr-2" />
                    </>
                  )}
                  <span>
                    {localScheduleMode === "cron" && t("cronjobs.cronSyntax")}
                    {localScheduleMode === "human" &&
                      t("cronjobs.humanReadable")}
                    {localScheduleMode === "both" && t("cronjobs.both")}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>

              {isScheduleDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 min-w-[140px]">
                  <button
                    onClick={() => {
                      setLocalScheduleMode("cron");
                      setIsScheduleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                      localScheduleMode === "cron"
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }`}
                  >
                    <Code className="h-3 w-3" />
                    {t("cronjobs.cronSyntax")}
                  </button>
                  <button
                    onClick={() => {
                      setLocalScheduleMode("human");
                      setIsScheduleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                      localScheduleMode === "human"
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {t("cronjobs.humanReadable")}
                  </button>
                  <button
                    onClick={() => {
                      setLocalScheduleMode("both");
                      setIsScheduleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                      localScheduleMode === "both"
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }`}
                  >
                    <Code className="h-3 w-3" />
                    <MessageSquare className="h-3 w-3" />
                    {t("cronjobs.both")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="btn-primary" onClick={handleSave}>
            {t("cronjobs.applyFilters")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
