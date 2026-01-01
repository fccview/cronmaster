import Link from "next/link";
import { getTranslations } from "@/app/_server/actions/translations";
import { SnakeGame } from "@/app/_components/FeatureComponents/Games/SnakeGame";
import { Logo } from "@/app/_components/GlobalComponents/Logo/Logo";
import { SystemInfoCard } from "@/app/_components/FeatureComponents/System/SystemInfo";
import { ThemeToggle } from "@/app/_components/FeatureComponents/Theme/ThemeToggle";
import { LogoutButton } from "@/app/_components/FeatureComponents/LoginForm/LogoutButton";
import { ToastContainer } from "@/app/_components/GlobalComponents/UIElements/Toast";
import { PWAInstallPrompt } from "@/app/_components/FeatureComponents/PWA/PWAInstallPrompt";
import { SSEProvider } from "@/app/_contexts/SSEContext";

export default async function NotFound() {
  const t = await getTranslations();
  const liveUpdatesEnabled =
    (typeof process.env.LIVE_UPDATES === "boolean" &&
      process.env.LIVE_UPDATES === true) ||
    process.env.LIVE_UPDATES !== "false";

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

  const bodyClass = process.env.DISABLE_SYSTEM_STATS === "true" ? "no-sidebar" : "";

  return (
    <SSEProvider liveUpdatesEnabled={liveUpdatesEnabled}>
      <div className={`min-h-screen bg-background0 ${bodyClass}`}>
        <header className="ascii-border !border-r-0 sticky top-0 z-20 bg-background0 lg:h-[90px]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between lg:justify-center">
              <div className="flex items-center gap-4">
                <Logo size={48} showGlow={true} />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold terminal-font uppercase">
                    Cr*nMaster
                  </h1>
                  <p className="text-xs terminal-font flex items-center gap-2">
                    {t("common.cronManagementMadeEasy")}
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

        {process.env.DISABLE_SYSTEM_STATS !== "true" && (
          <SystemInfoCard systemInfo={initialSystemInfo} />
        )}

        <main className="transition-all duration-300">
          <div className="px-4 py-8 lg:px-8">
            <div className="text-center mt-6 mb-12">
              <div className="text-6xl font-bold terminal-font text-status-error mb-2">404</div>
              <p className="terminal-font text-sm mb-4">{t("notFound.message")}</p>
              <Link
                href="/"
                className="ascii-border bg-background1 hover:bg-background2 px-4 py-2 terminal-font uppercase font-bold transition-colors text-sm inline-block"
              >
                {t("notFound.goHome")}
              </Link>
            </div>

            <SnakeGame />
          </div>
        </main>

        <ToastContainer />

        <div className="flex items-center gap-2 fixed bottom-4 left-4 lg:right-4 lg:left-auto z-10 bg-background0 ascii-border p-1">
          <ThemeToggle />
          <PWAInstallPrompt />
        </div>
      </div>
    </SSEProvider>
  );
}
