import { SystemInfoCard } from "./_components/SystemInfo";
import { CronJobList } from "./_components/CronJobList";
import { ThemeToggle } from "./_components/ui/ThemeToggle";
import { fetchCronJobs, fetchSystemInfo } from "./_server/actions/cronjobs";
import { Clock, Activity, Settings } from "lucide-react";

export default async function Home() {
  const [cronJobs, systemInfo] = await Promise.all([
    fetchCronJobs(),
    fetchSystemInfo(),
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
                      Active Jobs: {cronJobs.length}
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

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold brand-gradient-alt mb-4">
              Master Your Scheduled Tasks
            </h2>
            <p className="text-muted-foreground text-responsive max-w-2xl mx-auto">
              ChronosFlow provides an intuitive interface for managing cron jobs
              with intelligent scheduling, real-time monitoring, and powerful
              automation capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-2">
              <SystemInfoCard systemInfo={systemInfo} />
            </div>

            <div className="xl:col-span-3">
              <CronJobList cronJobs={cronJobs} />
            </div>
          </div>
        </main>

        <footer className="border-t border-border/50 bg-background/80 backdrop-blur-md mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold brand-gradient">
                    ChronosFlow
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>© 2024 ChronosFlow</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Built with Next.js & TypeScript</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{systemInfo.platform}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span>Host: {systemInfo.hostname}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
