"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type JSX,
} from "react";
import { useTranslations } from "next-intl";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";
const subscribeToNothing = () => () => {};
const getIsStandalone = () => window.matchMedia(STANDALONE_QUERY).matches;
const getIsStandaloneOnServer = () => false;

export const PWAInstallPrompt = (): JSX.Element | null => {
  const t = useTranslations();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const isStandalone = useSyncExternalStore(
    subscribeToNothing,
    getIsStandalone,
    getIsStandaloneOnServer
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforeInstallPrompt = (e: Event) => {
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferred(null);
      setIsInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null);
      }
    } catch { }
  }, [deferred]);

  if (isInstalled || isStandalone || !deferred) return null;

  return (
    <button
      className="px-3 py-2 ascii-border bg-background0 hover:bg-background1 transition-colors terminal-font text-sm"
      onClick={onInstall}
    >
      {t("common.install")}
    </button>
  );
};
