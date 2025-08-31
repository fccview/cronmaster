import { SystemInfoCard } from "./_components/SystemInfo";
import { TabbedInterface } from "./_components/TabbedInterface";
import { getCronJobs } from "./_utils/system";
import { fetchScripts } from "./_server/actions/scripts";
import { ThemeToggle } from "./_components/ui/ThemeToggle";
import { LogoutButton } from "./_components/ui/LogoutButton";
import { ToastContainer } from "./_components/ui/Toast";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [cronJobs, scripts] = await Promise.all([
    getCronJobs(),
    fetchScripts(),
  ]);

  const initialSystemInfo = {
    hostname: "Loading...",
    platform: "Loading...",
    uptime: "Loading...",
    memory: {
      total: "0 B",
      used: "0 B",
      free: "0 B",
      usage: 0,
      status: "Loading",
    },
    cpu: {
      model: "Loading...",
      cores: 0,
      usage: 0,
      status: "Loading",
    },
    gpu: {
      model: "Loading...",
      status: "Loading",
    },
    disk: {
      total: "0 B",
      used: "0 B",
      free: "0 B",
      usage: 0,
      status: "Loading",
    },
    systemStatus: {
      overall: "Loading",
      details: "Fetching system information...",
    },
  };

  return (
    <div className="min-h-screen relative">
      <div className="hero-gradient absolute inset-0 -z-10"></div>
      <div className="relative z-10">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20 shadow-sm lg:h-[90px]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between lg:justify-center">
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
              {process.env.AUTH_PASSWORD && (
                <div className="lg:absolute lg:right-10">
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        </header>

        <SystemInfoCard systemInfo={initialSystemInfo} />

        <main className="lg:ml-80 transition-all duration-300 ml-0 sidebar-collapsed:lg:ml-16">
          <div className="container mx-auto px-4 py-8 lg:px-8">
            <TabbedInterface cronJobs={cronJobs} scripts={scripts} />
          </div>
        </main>
      </div>

      <ToastContainer />

      <div className="flex items-center gap-2 fixed bottom-4 left-4 lg:right-4 lg:left-auto z-10 bg-background/80 backdrop-blur-md border border-border/50 rounded-lg p-1">
        <ThemeToggle />
      </div>
    </div>
  );
}
