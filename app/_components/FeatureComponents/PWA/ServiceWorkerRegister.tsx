"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister = (): null => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const alreadyRegistered = registrations.some((r) =>
          r.scope.endsWith("/")
        );
        if (alreadyRegistered) return;
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (_err) { }
    };
    register();
  }, []);

  return null;
};
