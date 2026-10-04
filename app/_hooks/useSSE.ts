"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SSEEvent, SSEEventType } from "@/app/_utils/sse-events";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("ui:sse");

type SSEEventHandler = (event: SSEEvent) => void;
type SSEErrorHandler = (error: Event) => void;

interface UseSSEOptions {
  enabled?: boolean;
  onEvent?: SSEEventHandler;
  onError?: SSEErrorHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Custom hook for consuming Server-Sent Events
 *
 * @param options Configuration options
 * @returns Object with connection status and manual control functions
 *
 * @example
 * ```tsx
 * const { isConnected } = useSSE({
 *   enabled: true,
 *   onEvent: (event) => {
 *     if (event.type === 'job-started') {
 *       console.log('Job started:', event.data);
 *     }
 *   },
 * });
 * ```
 */
export const useSSE = (options: UseSSEOptions = {}) => {
  const { enabled = true, onEvent, onError, onConnect, onDisconnect } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
    onErrorRef.current = onError;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  });

  const connect = useCallback(() => {
    if (eventSourceRef.current || !enabled) {
      return;
    }

    try {
      const eventSource = new EventSource("/api/events");

      eventSource.onopen = () => {
        setIsConnected(true);
        onConnectRef.current?.();
      };

      eventSource.onerror = (error) => {
        setIsConnected(false);
        onErrorRef.current?.(error);

        if (eventSource.readyState === EventSource.CLOSED) {
          onDisconnectRef.current?.();
        }
      };

      const eventTypes: SSEEventType[] = [
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
            onEventRef.current?.(data);
          } catch (error) {
            log.error(`Failed to parse ${eventType} event`, error);
          }
        });
      });

      eventSourceRef.current = eventSource;
    } catch (error) {
      log.error("Failed to create EventSource", error);
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      onDisconnectRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
  };
};
