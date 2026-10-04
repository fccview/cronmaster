import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm, utimes, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  getLogFileDate,
  getMaxLogAgeDays,
  getMaxLogsPerJob,
  isLogFileFromRun,
  listLogFiles,
  parseLogFilenameDate,
  pruneLogDirectory,
  pruneLogDirectoryIfDue,
  resetLogPruneThrottle,
} from "@/app/_utils/log-files-utils";

const pad = (n: number) => String(n).padStart(2, "0");

const logName = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours()
  )}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.log`;

const EPOCH = new Date(0);

let dir: string;

const createLog = async (name: string, mtime: Date = EPOCH) => {
  const fullPath = path.join(dir, name);
  await writeFile(fullPath, "Exit Code : 0\n");
  await utimes(fullPath, mtime, mtime);
  return fullPath;
};

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cronmaster-logs-"));
  resetLogPruneThrottle();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("parseLogFilenameDate", () => {
  it("reads the wrapper timestamp as local time", () => {
    const date = parseLogFilenameDate("2025-11-10_14-30-05.log");
    expect(date).toEqual(new Date(2025, 10, 10, 14, 30, 5));
  });

  it("accepts full paths", () => {
    expect(
      parseLogFilenameDate("/app/data/logs/abc/2024-02-29_00-00-00.log")
    ).toEqual(new Date(2024, 1, 29, 0, 0, 0));
  });

  it("rejects junk and impossible dates", () => {
    expect(parseLogFilenameDate("output.log")).toBeNull();
    expect(parseLogFilenameDate("2025-13-01_00-00-00.log")).toBeNull();
    expect(parseLogFilenameDate("2025-02-30_00-00-00.log")).toBeNull();
    expect(parseLogFilenameDate("2025-01-01_24-00-00.log")).toBeNull();
  });
});

describe("getLogFileDate", () => {
  it("prefers the filename over any stat time", () => {
    const mtime = new Date(2020, 0, 1);
    expect(getLogFileDate("2025-11-10_14-30-00.log", { mtime })).toEqual(
      new Date(2025, 10, 10, 14, 30, 0)
    );
  });

  it("falls back to mtime when the filename has no timestamp", () => {
    const mtime = new Date(2025, 5, 1, 12, 0, 0);
    expect(getLogFileDate("custom.log", { mtime })).toEqual(mtime);
  });

  it("never returns epoch zero, so a missing birthtime cannot age a file", () => {
    const date = getLogFileDate("custom.log", {
      mtime: EPOCH,
      birthtime: EPOCH,
    } as { mtime: Date });
    expect(date.getTime()).toBeGreaterThan(0);
  });
});

describe("isLogFileFromRun", () => {
  const start = new Date(2025, 0, 1, 12, 0, 0);

  it("matches files written since the run started", () => {
    expect(
      isLogFileFromRun("2024-01-01_00-00-00.log", { mtime: new Date(start.getTime() + 1000) }, start)
    ).toBe(true);
  });

  it("rejects files last written before the run", () => {
    expect(
      isLogFileFromRun("2025-01-01_12-00-00.log", { mtime: new Date(start.getTime() - 60000) }, start)
    ).toBe(false);
  });

  it("uses the filename when mtime is unusable", () => {
    expect(isLogFileFromRun("2025-01-01_12-00-01.log", { mtime: EPOCH }, start)).toBe(true);
    expect(isLogFileFromRun("2025-01-01_11-00-00.log", { mtime: EPOCH }, start)).toBe(false);
  });
});

describe("log limits", () => {
  it("reads MAX_LOGS_PER_JOB and MAX_LOG_AGE_DAYS with sane defaults", () => {
    vi.stubEnv("MAX_LOGS_PER_JOB", "");
    vi.stubEnv("MAX_LOG_AGE_DAYS", "");
    expect(getMaxLogsPerJob()).toBe(50);
    expect(getMaxLogAgeDays()).toBe(30);

    vi.stubEnv("MAX_LOGS_PER_JOB", "7");
    vi.stubEnv("MAX_LOG_AGE_DAYS", "3");
    expect(getMaxLogsPerJob()).toBe(7);
    expect(getMaxLogAgeDays()).toBe(3);

    vi.stubEnv("MAX_LOGS_PER_JOB", "nope");
    vi.stubEnv("MAX_LOG_AGE_DAYS", "-4");
    expect(getMaxLogsPerJob()).toBe(50);
    expect(getMaxLogAgeDays()).toBe(30);
  });
});

describe("pruneLogDirectory", () => {
  it("keeps recent logs even when the filesystem reports epoch timestamps", async () => {
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      await createLog(logName(new Date(now.getTime() - i * 60000)), EPOCH);
    }

    const deleted = await pruneLogDirectory(dir, { maxFiles: 50, maxAgeDays: 30, now });

    expect(deleted).toBe(0);
    expect(await readdir(dir)).toHaveLength(3);
  });

  it("keeps the newest N files by filename date", async () => {
    const now = new Date(2025, 5, 15, 12, 0, 0);
    const names: string[] = [];
    for (let i = 0; i < 6; i++) {
      const name = logName(new Date(now.getTime() - i * 3600000));
      names.push(name);
      await createLog(name, new Date(now.getTime() - (6 - i) * 1000));
    }

    const deleted = await pruneLogDirectory(dir, { maxFiles: 4, maxAgeDays: 30, now });

    expect(deleted).toBe(2);
    expect((await readdir(dir)).sort()).toEqual(names.slice(0, 4).sort());
  });

  it("drops logs older than the max age", async () => {
    const now = new Date(2025, 5, 15, 12, 0, 0);
    const fresh = logName(new Date(2025, 5, 14, 12, 0, 0));
    const stale = logName(new Date(2025, 4, 1, 12, 0, 0));
    await createLog(fresh, now);
    await createLog(stale, now);

    await pruneLogDirectory(dir, { maxFiles: 50, maxAgeDays: 30, now });

    expect(await readdir(dir)).toEqual([fresh]);
  });

  it("ages files without a timestamped name by mtime and ignores non-log files", async () => {
    const now = new Date(2025, 5, 15, 12, 0, 0);
    await createLog("manual.log", new Date(2025, 0, 1));
    await createLog("recent.log", new Date(2025, 5, 15, 11, 0, 0));
    await writeFile(path.join(dir, "notes.txt"), "keep me");

    await pruneLogDirectory(dir, { maxFiles: 50, maxAgeDays: 30, now });

    expect((await readdir(dir)).sort()).toEqual(["notes.txt", "recent.log"]);
  });

  it("uses MAX_LOGS_PER_JOB when no explicit cap is given", async () => {
    vi.stubEnv("MAX_LOGS_PER_JOB", "2");
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      await createLog(logName(new Date(now.getTime() - i * 1000)));
    }

    expect(await pruneLogDirectory(dir)).toBe(2);
    expect(await listLogFiles(dir)).toHaveLength(2);
  });

  it("returns 0 for a missing directory", async () => {
    expect(await pruneLogDirectory(path.join(dir, "nope"))).toBe(0);
  });
});

describe("listLogFiles", () => {
  it("sorts newest first by filename date", async () => {
    await createLog("2025-01-01_10-00-00.log", new Date(2025, 5, 1));
    await createLog("2025-01-02_10-00-00.log", new Date(2025, 0, 1));
    const files = await listLogFiles(dir);
    expect(files.map((f) => f.name)).toEqual([
      "2025-01-02_10-00-00.log",
      "2025-01-01_10-00-00.log",
    ]);
  });
});

describe("pruneLogDirectoryIfDue", () => {
  it("prunes at most once per interval per directory", async () => {
    vi.stubEnv("MAX_LOGS_PER_JOB", "1");
    const now = new Date();
    await createLog(logName(now));
    await createLog(logName(new Date(now.getTime() - 1000)));

    expect(await pruneLogDirectoryIfDue(dir, 60000)).toBe(1);

    await createLog(logName(new Date(now.getTime() - 2000)));
    expect(await pruneLogDirectoryIfDue(dir, 60000)).toBe(0);
    expect(await readdir(dir)).toHaveLength(2);
  });
});
