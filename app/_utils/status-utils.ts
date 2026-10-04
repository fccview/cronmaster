export type ResourceStatus = "optimal" | "moderate" | "high" | "critical";
export type OverallStatus = "optimal" | "warning" | "critical";
export type AvailabilityStatus = "available" | "connected" | "unknown";
export type StatusCode =
  | ResourceStatus
  | OverallStatus
  | AvailabilityStatus
  | "loading";

const STATUS_LABEL_KEYS: Record<StatusCode, string> = {
  optimal: "system.optimal",
  moderate: "system.moderate",
  high: "system.high",
  critical: "system.critical",
  warning: "system.warning",
  available: "system.available",
  connected: "system.connected",
  unknown: "system.unknown",
  loading: "common.loading",
};

const OVERALL_DETAIL_KEYS: Partial<Record<StatusCode, string>> = {
  optimal: "system.allSystemsRunningNormally",
  warning: "system.moderateResourceUsageMonitoringRecommended",
  critical: "system.highResourceUsageDetectedImmediateAttentionRequired",
  loading: "system.fetchingSystemInformation",
};

const isStatusCode = (status: string): status is StatusCode =>
  status in STATUS_LABEL_KEYS;

export const statusLabelKey = (status: string) => {
  const code = status.toLowerCase();
  return isStatusCode(code) ? STATUS_LABEL_KEYS[code] : "system.unknown";
};

export const overallDetailsKey = (status: string) => {
  const code = status.toLowerCase();
  return (isStatusCode(code) && OVERALL_DETAIL_KEYS[code]) || "system.unknown";
};
