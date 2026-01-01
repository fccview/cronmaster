"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/UIElements/Modal";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { CaretDownIcon, CodeIcon, ChatTextIcon } from "@phosphor-icons/react";
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
        <div className="space-y-4 min-h-[200px]">
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
                    <CodeIcon className="h-4 w-4 mr-2" />
                  )}
                  {localScheduleMode === "human" && (
                    <ChatTextIcon className="h-4 w-4 mr-2" />
                  )}
                  {localScheduleMode === "both" && (
                    <>
                      <CodeIcon className="h-4 w-4 mr-1" />
                      <ChatTextIcon className="h-4 w-4 mr-2" />
                    </>
                  )}
                  <span>
                    {localScheduleMode === "cron" && t("cronjobs.cronSyntax")}
                    {localScheduleMode === "human" &&
                      t("cronjobs.humanReadable")}
                    {localScheduleMode === "both" && t("cronjobs.both")}
                  </span>
                </div>
                <CaretDownIcon className="h-4 w-4 ml-2" />
              </Button>

              {isScheduleDropdownOpen && (
                <div className="absolute top-full left-0 p-1 right-0 mt-1 bg-background0 border border-border rounded-md shadow-lg z-50 min-w-[140px]">
                  <button
                    onClick={() => {
                      setLocalScheduleMode("cron");
                      setIsScheduleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 border py-2 text-sm hover:border-border border-transparent transition-colors flex items-center gap-2 ${localScheduleMode === "cron"
                      ? "border-border"
                      : ""
                      }`}
                  >
                    <CodeIcon className="h-3 w-3" />
                    {t("cronjobs.cronSyntax")}
                  </button>
                  <button
                    onClick={() => {
                      setLocalScheduleMode("human");
                      setIsScheduleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 border text-sm hover:border-border border-transparent transition-colors flex items-center gap-2 ${localScheduleMode === "human"
                      ? "border-border"
                      : ""
                      }`}
                  >
                    <ChatTextIcon className="h-3 w-3" />
                    {t("cronjobs.humanReadable")}
                  </button>
                  <button
                    onClick={() => {
                      setLocalScheduleMode("both");
                      setIsScheduleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 border text-sm hover:border-border border-transparent transition-colors flex items-center gap-2 ${localScheduleMode === "both"
                      ? "border-border"
                      : ""
                      }`}
                  >
                    <CodeIcon className="h-3 w-3" />
                    <ChatTextIcon className="h-3 w-3" />
                    {t("cronjobs.both")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
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
