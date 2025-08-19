import { SystemInfoCard } from "./_components/SystemInfo";
import { TabbedInterface } from "./_components/TabbedInterface";
import { getSystemInfo, getCronJobs } from "./_utils/system";
import { fetchScripts } from "./_server/actions/scripts";
import { ThemeToggle } from "./_components/ui/ThemeToggle";
import { ToastContainer } from "./_components/ui/Toast";
import { Asterisk, Terminal, Zap } from "lucide-react";
export const dynamic = "force-dynamic";

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
                  <img src="/logo.png" alt="logo" className="w-14 h-14" />
                  <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
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
