import path from "path";
import { open, readdir, stat, unlink } from "fs/promises";
import type { Stats } from "fs";
import { DATA_DIR } from "../_consts/file";
import { createLogger } from "./logger";
import { parseExitCode } from "./log-format-utils";

const log = createLogger("logs");

const LOG_FILENAME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/;

const DEFAULT_MAX_LOGS_PER_JOB = 50;
const DEFAULT_MAX_LOG_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const LOG_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export interface LogFileInfo {
  name: string;
  fullPath: string;
  size: number;
  date: Date;
}

export interface LogPruneOptions {
  maxFiles?: number;
  maxAgeDays?: number;
  now?: Date;
}

const readPositiveInt = (
  value: string | undefined,
  fallback: number
): number => {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getMaxLogsPerJob = (): number =>
  readPositiveInt(process.env.MAX_LOGS_PER_JOB, DEFAULT_MAX_LOGS_PER_JOB);

export const getMaxLogAgeDays = (): number =>
  readPositiveInt(process.env.MAX_LOG_AGE_DAYS, DEFAULT_MAX_LOG_AGE_DAYS);

export const getLogsBaseDir = (): string =>
  path.join(process.cwd(), DATA_DIR, "logs");

export const getJobLogDir = (logFolderName: string): string =>
  path.join(getLogsBaseDir(), logFolderName);

const isUsableDate = (date: Date | null | undefined): date is Date =>
  date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;

export const parseLogFilenameDate = (filename: string): Date | null => {
  const match = path.basename(filename).match(LOG_FILENAME_PATTERN);
  if (!match) {
    return null;
  }

  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => parseInt(part, 10));

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, second);

  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
};

export const getLogFileDate = (
  filename: string,
  stats?: { mtime?: Date } | null
): Date => {
  const fromName = parseLogFilenameDate(filename);
  if (fromName) {
    return fromName;
  }

  const mtime = stats?.mtime;
  if (isUsableDate(mtime)) {
    return mtime;
  }

  return new Date();
};

export const isLogFileFromRun = (
  filename: string,
  stats: { mtime?: Date } | null | undefined,
  runStart: Date,
  toleranceMs: number = 5000
): boolean => {
  const threshold = runStart.getTime() - toleranceMs;
  const mtime = stats?.mtime;

  if (isUsableDate(mtime)) {
    return mtime.getTime() >= threshold;
  }

  const fromName = parseLogFilenameDate(filename);
  return fromName !== null && fromName.getTime() >= threshold;
};

const RUN_LOG_TOLERANCE_MS = 5000;
const EXIT_CODE_TAIL_BYTES = 4096;

export interface RunLogFile {
  name: string;
  fullPath: string;
  stats: Stats;
}

export const findRunLogFile = async (
  logDir: string,
  runStart: Date,
  cachedName?: string
): Promise<RunLogFile | null> => {
  if (cachedName) {
    const fullPath = path.join(logDir, cachedName);
    try {
      return { name: cachedName, fullPath, stats: await stat(fullPath) };
    } catch {}
  }

  let names: string[];
  try {
    names = await readdir(logDir);
  } catch {
    return null;
  }

  const candidates = names
    .filter((name) => name.endsWith(".log"))
    .sort()
    .reverse();

  for (const name of candidates) {
    const fullPath = path.join(logDir, name);
    try {
      const stats = await stat(fullPath);
      if (isLogFileFromRun(name, stats, runStart, RUN_LOG_TOLERANCE_MS)) {
        return { name, fullPath, stats };
      }
    } catch (error) {
      log.warn(`Could not stat log file ${fullPath}`, error);
    }
  }

  return null;
};

export const readLogExitCode = async (
  fullPath: string
): Promise<number | null> => {
  const handle = await open(fullPath, "r");
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, EXIT_CODE_TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    return parseExitCode(buffer.toString("utf-8"));
  } finally {
    await handle.close();
  }
};

export const listLogFiles = async (logDir: string): Promise<LogFileInfo[]> => {
  let names: string[];
  try {
    names = await readdir(logDir);
  } catch {
    return [];
  }

  const files: LogFileInfo[] = [];
  for (const name of names.filter((f) => f.endsWith(".log"))) {
    const fullPath = path.join(logDir, name);
    try {
      const stats = await stat(fullPath);
      files.push({
        name,
        fullPath,
        size: stats.size,
        date: getLogFileDate(name, stats),
      });
    } catch (error) {
      log.warn(`Could not stat log file ${fullPath}`, error);
    }
  }

  return files.sort(
    (a, b) =>
      b.date.getTime() - a.date.getTime() || b.name.localeCompare(a.name)
  );
};

export const pruneLogDirectory = async (
  logDir: string,
  options: LogPruneOptions = {}
): Promise<number> => {
  const maxFiles = options.maxFiles ?? getMaxLogsPerJob();
  const maxAgeMs = (options.maxAgeDays ?? getMaxLogAgeDays()) * DAY_MS;
  const now = (options.now ?? new Date()).getTime();

  const files = await listLogFiles(logDir);
  const doomed = files.filter(
    (file, index) =>
      index >= maxFiles || now - file.date.getTime() > maxAgeMs
  );

  let deleted = 0;
  for (const file of doomed) {
    try {
      await unlink(file.fullPath);
      deleted++;
    } catch (error) {
      log.warn(`Could not delete old log file ${file.fullPath}`, error);
    }
  }

  if (deleted > 0) {
    log.debug(`Pruned ${deleted} old log file(s) in ${logDir}`);
  }

  return deleted;
};

const lastPrunedAt = new Map<string, number>();

export const pruneLogDirectoryIfDue = async (
  logDir: string,
  intervalMs: number = LOG_CLEANUP_INTERVAL_MS
): Promise<number> => {
  const now = Date.now();
  const last = lastPrunedAt.get(logDir);
  if (last !== undefined && now - last < intervalMs) {
    return 0;
  }

  lastPrunedAt.set(logDir, now);
  return pruneLogDirectory(logDir);
};

export const resetLogPruneThrottle = (): void => {
  lastPrunedAt.clear();
};
