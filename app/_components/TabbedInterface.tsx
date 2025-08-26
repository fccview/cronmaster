"use client";

import { useState } from "react";
import { CronJobList } from "./CronJobList";
import { ScriptsManager } from "./ScriptsManager";
import { CronJob } from "@/app/_utils/system";
import { type Script } from "@/app/_server/actions/scripts";
import { Clock, FileText } from "lucide-react";

interface TabbedInterfaceProps {
  cronJobs: CronJob[];
  scripts: Script[];
}

export const TabbedInterface = ({ cronJobs, scripts }: TabbedInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<"cronjobs" | "scripts">(
    "cronjobs"
  );

  return (
    <div className="space-y-6">
      <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-lg p-1 glass-card">
        <div className="flex">
          <button
            onClick={() => setActiveTab("cronjobs")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-md flex-1 justify-center ${activeTab === "cronjobs"
                ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            <Clock className="h-4 w-4" />
            Cron Jobs
            <span className="ml-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              {cronJobs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("scripts")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-md flex-1 justify-center ${activeTab === "scripts"
                ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            <FileText className="h-4 w-4" />
            Scripts
            <span className="ml-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              {scripts.length}
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === "cronjobs" ? (
          <CronJobList cronJobs={cronJobs} scripts={scripts} />
        ) : (
          <ScriptsManager scripts={scripts} />
        )}
      </div>
    </div>
  );
}
