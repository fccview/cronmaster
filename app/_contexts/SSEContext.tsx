"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SSEEvent } from "@/app/_utils/sse-events";
import { usePageVisibility } from "@/app/_hooks/usePageVisibility";

interface SSEContextType {
  isConnected: boolean;
  subscribe: (callback: (event: SSEEvent) => void) => () => void;
}

const SSEContext = createContext<SSEContextType | null>(null);

export const SSEProvider: React.FC<{
  children: React.ReactNode;
  liveUpdatesEnabled: boolean;
}> = ({ children, liveUpdatesEnabled }) => {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Set<(event: SSEEvent) => void>>(new Set());
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    if (!liveUpdatesEnabled || !isPageVisible) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const eventSource = new EventSource("/api/events");

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    const eventTypes = [
      "job-started",
      "job-completed",
      "job-failed",
      "log-line",
      "system-stats",
      "heartbeat",
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          subscribersRef.current.forEach((callback) => callback(data));
        } catch (error) {
          console.error(`[SSE] Failed to parse ${eventType} event:`, error);
        }
      });
    });

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [liveUpdatesEnabled, isPageVisible]);

  const subscribe = (callback: (event: SSEEvent) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  };

  return (
    <SSEContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSEContext = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSEContext must be used within SSEProvider");
  }
  return context;
};
