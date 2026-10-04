import { statfs } from "fs/promises";
import path from "path";
import { createLogger } from "@/app/_utils/logger";
import { formatBytes, getStatus } from "@/app/_utils/system-stats-utils";

const log = createLogger("system:disk");

export const DEFAULT_DISK_MOUNTS = ["/"];
export const MAX_DISK_MOUNTS = 8;
export const DISK_STATS_TTL_MS = 60_000;
export const DISK_STATFS_TIMEOUT_MS = 5_000;
export const HOST_ROOT_PREFIX = "/proc/1/root";

export interface RawDiskStat {
  mount: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usage: number;
  inodes: {
    total: number;
    used: number;
    free: number;
    usage: number;
  } | null;
}

type StatfsFn = (target: string) => Promise<{
  bsize: number;
  blocks: number;
  bfree: number;
  bavail: number;
  files: number;
  ffree: number;
}>;

export const isDiskStatsDisabled = (): boolean =>
  process.env.DISABLE_SYSTEM_STATS === "true" ||
  process.env.DISABLE_DISK_STATS === "true";

export const isValidMount = (mount: string): boolean =>
  mount.length > 0 &&
  mount.length <= 4096 &&
  path.posix.isAbsolute(mount) &&
  !/[\x00-\x1f\x7f]/.test(mount) &&
  !mount.split("/").some((segment) => segment === ".." || segment === ".");

export const normalizeMount = (mount: string): string => {
  const normalized = path.posix.normalize(mount);
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
};

export const parseDiskMounts = (raw: string | undefined): string[] => {
  if (raw === undefined || raw.trim() === "") return [...DEFAULT_DISK_MOUNTS];

  const mounts: string[] = [];
  for (const entry of raw.split(",")) {
    const candidate = entry.trim();
    if (!candidate) continue;
    if (!isValidMount(candidate)) {
      log.warn("Ignoring invalid DISK_MOUNTS entry", { entry: candidate });
      continue;
    }
    const mount = normalizeMount(candidate);
    if (mounts.includes(mount)) continue;
    if (mounts.length >= MAX_DISK_MOUNTS) {
      log.warn("Too many DISK_MOUNTS entries, ignoring the rest", {
        max: MAX_DISK_MOUNTS,
      });
      break;
    }
    mounts.push(mount);
  }

  return mounts.length > 0 ? mounts : [...DEFAULT_DISK_MOUNTS];
};

export const resolveStatTargets = (
  mount: string,
  docker: boolean
): string[] => {
  if (!docker) return [mount];
  const hostPath = mount === "/" ? `${HOST_ROOT_PREFIX}/` : `${HOST_ROOT_PREFIX}${mount}`;
  return [hostPath, mount];
};

const warnedMounts = new Set<string>();

const withTimeout =<T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`statfs timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const percent = (used: number, total: number): number =>
  total > 0 ? Math.round((used / total) * 1000) / 10 : 0;

export const statMount = async (
  mount: string,
  docker: boolean,
  statfsFn: StatfsFn = statfs
): Promise<RawDiskStat | null> => {
  for (const target of resolveStatTargets(mount, docker)) {
    try {
      const stats = await withTimeout(statfsFn(target), DISK_STATFS_TIMEOUT_MS);
      if (!stats.blocks) continue;

      const totalBytes = stats.blocks * stats.bsize;
      const usedBytes = (stats.blocks - stats.bfree) * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      const inodesUsed = stats.files - stats.ffree;

      return {
        mount,
        totalBytes,
        usedBytes,
        freeBytes,
        usage: percent(usedBytes, usedBytes + freeBytes),
        inodes:
          stats.files > 0
            ? {
              total: stats.files,
              used: inodesUsed,
              free: stats.ffree,
              usage: percent(inodesUsed, stats.files),
            }
            : null,
      };
    } catch (error) {
      log.debug("statfs failed", {
        mount,
        target,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!warnedMounts.has(mount)) {
    warnedMounts.add(mount);
    log.warn("Unable to read disk stats", { mount });
  }
  return null;
};

export const collectDiskStats = async (
  mounts: string[],
  docker: boolean,
  statfsFn: StatfsFn = statfs
): Promise<RawDiskStat[]> => {
  const results: RawDiskStat[] = [];
  for (const mount of mounts) {
    const stat = await statMount(mount, docker, statfsFn);
    if (stat) results.push(stat);
  }
  return results;
};

interface DiskStatsCache {
  key: string;
  expiresAt: number;
  value: RawDiskStat[];
}

let cache: DiskStatsCache | null = null;
let inflight: { key: string; promise: Promise<RawDiskStat[]> } | null = null;
let parsedMounts: { raw: string | undefined; mounts: string[] } | null = null;

export const resetDiskStatsCache = () => {
  cache = null;
  inflight = null;
  parsedMounts = null;
  warnedMounts.clear();
};

export const getDiskStats = async (
  options: {
    now?: () => number;
    statfsFn?: StatfsFn;
  } = {}
): Promise<RawDiskStat[] | null> => {
  if (isDiskStatsDisabled()) return null;

  const now = options.now ?? Date.now;
  const rawMounts = process.env.DISK_MOUNTS;
  if (!parsedMounts || parsedMounts.raw !== rawMounts) {
    parsedMounts = { raw: rawMounts, mounts: parseDiskMounts(rawMounts) };
  }
  const mounts = parsedMounts.mounts;
  const docker = process.env.DOCKER === "true";
  const key = `${docker}|${mounts.join(",")}`;

  if (cache && cache.key === key && cache.expiresAt > now()) {
    return cache.value;
  }

  if (inflight && inflight.key === key) return inflight.promise;

  const promise = collectDiskStats(mounts, docker, options.statfsFn)
    .then((value) => {
      cache = { key, expiresAt: now() + DISK_STATS_TTL_MS, value };
      log.debug("Disk stats refreshed", { mounts });
      return value;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });

  inflight = { key, promise };
  return promise;
};

export const formatCount = (value: number): string => {
  if (value < 1000) return String(value);
  const units = ["K", "M", "B", "T"];
  let scaled = value;
  let unit = -1;
  while (scaled >= 1000 && unit < units.length - 1) {
    scaled /= 1000;
    unit++;
  }
  return `${scaled.toFixed(1)}${units[unit]}`;
};

const DISK_THRESHOLDS = { critical: 90, high: 80, moderate: 70 };

export const formatDiskStats = (stats: RawDiskStat[]) =>
  stats.map((stat) => ({
    mount: stat.mount,
    total: formatBytes(stat.totalBytes),
    used: formatBytes(stat.usedBytes),
    free: formatBytes(stat.freeBytes),
    usage: stat.usage,
    status: getStatus(stat.usage, DISK_THRESHOLDS),
    inodes: stat.inodes
      ? {
        total: formatCount(stat.inodes.total),
        used: formatCount(stat.inodes.used),
        free: formatCount(stat.inodes.free),
        usage: stat.inodes.usage,
        status: getStatus(stat.inodes.usage, DISK_THRESHOLDS),
      }
      : null,
  }));
