import { SystemInfoCard } from "./_components/SystemInfo";
import { TabbedInterface } from "./_components/TabbedInterface";
import { getSystemInfo, getCronJobs } from "./_utils/system";
import { fetchScripts } from "./_server/actions/scripts";
import { ThemeToggle } from "./_components/ui/ThemeToggle";
import { ToastContainer } from "./_components/ui/Toast";
import { Terminal, Zap } from "lucide-react";

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
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20 shadow-sm lg:h-[90px]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl shadow-lg">
                    <div className="relative">
                      <Terminal className="h-6 w-6 text-white" />
                      <Zap className="h-3 w-3 text-white absolute -top-1 -right-1" />
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold brand-gradient brand-text">
                    Cr*nMaster
                  </h1>
                  <p className="text-xs text-muted-foreground font-mono tracking-wide">
                    Cron Management made easy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <SystemInfoCard systemInfo={systemInfo} />

        <main className="lg:ml-80 transition-all duration-300 ml-0 sidebar-collapsed:lg:ml-16">
          <div className="container mx-auto px-4 py-8 lg:px-8">
            <TabbedInterface cronJobs={cronJobs} scripts={scripts} />
          </div>
        </main>
      </div>

      <ToastContainer />

      <div className="flex items-center gap-2 fixed bottom-4 left-4 lg:right-4 lg:left-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
