
export type SSEEventType =
  | "job-started"
  | "job-completed"
  | "job-failed"
  | "log-line"
  | "system-stats"
  | "heartbeat";

export interface BaseSSEEvent {
  type: SSEEventType;
  timestamp: string;
}

export interface JobStartedEvent extends BaseSSEEvent {
  type: "job-started";
  data: {
    runId: string;
    cronJobId: string;
    hasLogging: boolean;
  };
}

export interface JobCompletedEvent extends BaseSSEEvent {
  type: "job-completed";
  data: {
    runId: string;
    cronJobId: string;
    exitCode: number;
    duration?: number;
  };
}

export interface JobFailedEvent extends BaseSSEEvent {
  type: "job-failed";
  data: {
    runId: string;
    cronJobId: string;
    exitCode: number;
    error?: string;
  };
}

export interface LogLineEvent extends BaseSSEEvent {
  type: "log-line";
  data: {
    runId: string;
    cronJobId: string;
    line: string;
    lineNumber: number;
  };
}

export interface SystemStatsEvent extends BaseSSEEvent {
  type: "system-stats";
  data: any;
}

export interface HeartbeatEvent extends BaseSSEEvent {
  type: "heartbeat";
  data: {
    message: string;
  };
}

export type SSEEvent =
  | JobStartedEvent
  | JobCompletedEvent
  | JobFailedEvent
  | LogLineEvent
  | SystemStatsEvent
  | HeartbeatEvent;

export const formatSSEEvent = (event: SSEEvent): string => {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
};

export const createHeartbeatEvent = (): HeartbeatEvent => {
  return {
    type: "heartbeat",
    timestamp: new Date().toISOString(),
    data: {
      message: "alive",
    },
  };
};
