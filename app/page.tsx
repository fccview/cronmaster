import { SystemInfoCard } from "./_components/SystemInfo";
import { CronJobList } from "./_components/CronJobList";
import { ScriptsManager } from "./_components/ScriptsManager";
import { getSystemInfo, getCronJobs } from "./_utils/system";
import { fetchScripts } from "./_server/actions/scripts";
import { ThemeToggle } from "./_components/ui/ThemeToggle";
import { Clock, Activity } from "lucide-react";

export default async function Home() {
  const [systemInfo, cronJobs, scripts] = await Promise.all([
    getSystemInfo(),
    getCronJobs(),
    fetchScripts(),
  ]);

  return (
    <div className="min-h-screen relative">
      <div className="hero-gradient absolute inset-0 -z-10"></div>
      <div className="relative z-10">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl shadow-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold brand-gradient brand-text">
                    ChronosFlow
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Advanced Cron Management & Automation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <span className="hidden lg:inline">
                      Scheduled Jobs: {cronJobs.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </header>

        <SystemInfoCard systemInfo={systemInfo} />

        <main className="lg:ml-80 transition-all duration-300 ml-0 sidebar-collapsed:lg:ml-16">
          <div className="container mx-auto px-4 py-8 lg:px-8">
            <div className="space-y-8">
              {/* Scripts Library Section */}
              <ScriptsManager scripts={scripts} />

              {/* Cron Jobs Section */}
              <CronJobList cronJobs={cronJobs} scripts={scripts} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
