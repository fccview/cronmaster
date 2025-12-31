"use client";

import { useState } from "react";
import { CronJobList } from "@/app/_components/FeatureComponents/Cronjobs/CronJobList";
import { ScriptsManager } from "@/app/_components/FeatureComponents/Scripts/ScriptsManager";
import { CronJob } from "@/app/_utils/cronjob-utils";
import { Script } from "@/app/_utils/scripts-utils";
import { ClockIcon, FileTextIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

interface TabbedInterfaceProps {
  cronJobs: CronJob[];
  scripts: Script[];
}

export const TabbedInterface = ({
  cronJobs,
  scripts,
}: TabbedInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<"cronjobs" | "scripts">(
    "cronjobs"
  );
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="tui-card p-1 terminal-font">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("cronjobs")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium flex-1 justify-center terminal-font ${activeTab === "cronjobs"
              ? "bg-background0 ascii-border"
              : "hover:ascii-border"
              }`}
          >
            <ClockIcon className="h-4 w-4" />
            {t("cronjobs.cronJobs")}
            <span className="ml-1 text-xs bg-background2 px-2 py-0.5 ascii-border font-medium">
              {cronJobs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("scripts")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium flex-1 justify-center terminal-font ${activeTab === "scripts"
              ? "bg-background0 ascii-border"
              : "hover:ascii-border"
              }`}
          >
            <FileTextIcon className="h-4 w-4" />
            {t("scripts.scripts")}
            <span className="ml-1 text-xs bg-background2 px-2 py-0.5 ascii-border font-medium">
              {scripts.length}
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-[60vh]">
        {activeTab === "cronjobs" ? (
          <CronJobList cronJobs={cronJobs} scripts={scripts} />
        ) : (
          <ScriptsManager scripts={scripts} />
        )}
      </div>
    </div>
  );
};
