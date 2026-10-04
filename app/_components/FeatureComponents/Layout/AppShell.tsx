import { readFileSync } from "fs";
import path from "path";
import { SystemInfoCard } from "@/app/_components/FeatureComponents/System/SystemInfo";
import { ThemeToggle } from "@/app/_components/FeatureComponents/Theme/ThemeToggle";
import { LogoutButton } from "@/app/_components/FeatureComponents/LoginForm/LogoutButton";
import { ToastContainer } from "@/app/_components/GlobalComponents/UIElements/Toast";
import { PWAInstallPrompt } from "@/app/_components/FeatureComponents/PWA/PWAInstallPrompt";
import { Logo } from "@/app/_components/GlobalComponents/Logo/Logo";
import { SSEProvider } from "@/app/_contexts/SSEContext";
import { getTranslations } from "@/app/_server/actions/translations";
import { isUiAuthEnabled } from "@/app/_utils/server-action-auth";
import { isLiveUpdatesEnabled } from "@/app/_utils/sse-broadcaster";

const getAppVersion = (): string => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf-8")).version;
};

export const AppShell = async ({ children }: { children: React.ReactNode }) => {
  const t = await getTranslations();
  const version = getAppVersion();
  const loading = `${t("common.loading")}...`;
  const systemStatsEnabled = process.env.DISABLE_SYSTEM_STATS !== "true";

  const initialSystemInfo = {
    hostname: loading,
    platform: loading,
    uptime: loading,
    memory: {
      total: "0 B",
      used: "0 B",
      free: "0 B",
      usage: 0,
      status: "loading",
    },
    cpu: {
      model: loading,
      cores: 0,
      usage: 0,
      status: "loading",
    },
    gpu: {
      model: loading,
      status: "loading",
    },
    systemStatus: {
      overall: "loading",
    },
  };

  return (
    <SSEProvider liveUpdatesEnabled={isLiveUpdatesEnabled()}>
      <div
        className={`min-h-screen bg-background0 ${systemStatsEnabled ? "" : "no-sidebar"}`}
      >
        <header className="border-border border-b sticky top-0 z-20 bg-background0 lg:h-[90px]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between lg:justify-center">
              <div className="flex items-center gap-4">
                <Logo size={48} showGlow={true} />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold terminal-font uppercase">
                    Cr<span className="text-status-error">*</span>nMaster
                  </h1>
                  <p className="text-xs terminal-font flex items-center gap-2">
                    <a href={`https://github.com/fccview/cronmaster/releases/tag/${version}`} target="_blank" rel="noopener noreferrer">
                      {t("common.version").replace("{version}", version)}
                    </a>
                  </p>
                </div>
              </div>
              {isUiAuthEnabled() && (
                <div className="lg:absolute lg:right-10">
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        </header>

        {systemStatsEnabled && <SystemInfoCard systemInfo={initialSystemInfo} />}

        <main className="transition-all duration-300">{children}</main>

        <ToastContainer />

        <div className="flex items-center gap-2 fixed bottom-4 left-4 lg:right-4 lg:left-auto z-10 bg-background0 ascii-border p-1">
          <ThemeToggle />
          <PWAInstallPrompt />
        </div>
      </div>
    </SSEProvider>
  );
};
