"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if the page/tab is currently visible to the user.
 * Returns true when the page is visible, false when hidden (user switched tabs).
 *
 * Use this to pause polling, SSE connections, or other resource-intensive
 * operations when the user is not actively viewing the page.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document !== "undefined" ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
