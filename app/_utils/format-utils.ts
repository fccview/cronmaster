const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${Number.isFinite(bytes) ? Math.max(0, Math.round(bytes)) : 0} B`;
  }
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${BYTE_UNITS[i]}`;
};
