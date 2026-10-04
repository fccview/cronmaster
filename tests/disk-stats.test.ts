import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({ statfs: vi.fn() }));
vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn(async () => false),
}));

import { statfs } from "fs/promises";
import { isDocker } from "@/app/_server/actions/global";
import {
  DISK_STATS_TTL_MS,
  MAX_DISK_MOUNTS,
  collectDiskStats,
  formatCount,
  formatDiskStats,
  getDiskStats,
  isValidMount,
  parseDiskMounts,
  resetDiskStatsCache,
  resolveStatTargets,
  statMount,
} from "@/app/_utils/disk-stats-utils";

const GiB = 1024 * 1024 * 1024;

const fakeStat = (overrides: Partial<Record<string, number>> = {}) => ({
  type: 0,
  bsize: 4096,
  blocks: (100 * GiB) / 4096,
  bfree: (40 * GiB) / 4096,
  bavail: (35 * GiB) / 4096,
  files: 1_000_000,
  ffree: 750_000,
  ...overrides,
});

const statfsMock = vi.mocked(statfs);

beforeEach(() => {
  resetDiskStatsCache();
  statfsMock.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.stubEnv("DISK_MOUNTS", "");
  vi.stubEnv("DISABLE_DISK_STATS", "");
  vi.stubEnv("DISABLE_SYSTEM_STATS", "");
  vi.stubEnv("DOCKER", "");
});

describe("parseDiskMounts", () => {
  it("defaults to the root filesystem only", () => {
    expect(parseDiskMounts(undefined)).toEqual(["/"]);
    expect(parseDiskMounts("")).toEqual(["/"]);
    expect(parseDiskMounts("  ")).toEqual(["/"]);
  });

  it("parses, trims, normalizes and dedupes", () => {
    expect(parseDiskMounts(" /, /mnt/data/ ,/mnt//data,/srv")).toEqual([
      "/",
      "/mnt/data",
      "/srv",
    ]);
  });

  it("drops invalid entries and falls back to root when nothing is left", () => {
    expect(
      parseDiskMounts("relative,/mnt/../etc,/ok,/bad\nline,/./x")
    ).toEqual(["/ok"]);
    expect(parseDiskMounts("nope,../up")).toEqual(["/"]);
  });

  it("caps the number of mounts", () => {
    const many = Array.from({ length: 20 }, (_, i) => `/m${i}`).join(",");
    expect(parseDiskMounts(many)).toHaveLength(MAX_DISK_MOUNTS);
  });

  it("validates mounts", () => {
    expect(isValidMount("/")).toBe(true);
    expect(isValidMount("/mnt/data")).toBe(true);
    expect(isValidMount("mnt")).toBe(false);
    expect(isValidMount("/a/../b")).toBe(false);
    expect(isValidMount("/a\u0000b")).toBe(false);
  });
});

describe("resolveStatTargets", () => {
  it("uses the path as is outside docker", () => {
    expect(resolveStatTargets("/mnt/data", false)).toEqual(["/mnt/data"]);
  });

  it("prefers the host view through /proc/1/root in docker", () => {
    expect(resolveStatTargets("/", true)).toEqual(["/proc/1/root/", "/"]);
    expect(resolveStatTargets("/mnt/data", true)).toEqual([
      "/proc/1/root/mnt/data",
      "/mnt/data",
    ]);
  });
});

describe("statMount", () => {
  it("computes space and inode usage like df", async () => {
    const fn = vi.fn().mockResolvedValue(fakeStat());
    const result = await statMount("/", false, fn);
    expect(fn).toHaveBeenCalledWith("/");
    expect(result).toEqual({
      mount: "/",
      totalBytes: 100 * GiB,
      usedBytes: 60 * GiB,
      freeBytes: 35 * GiB,
      usage: 63.2,
      inodes: { total: 1_000_000, used: 250_000, free: 750_000, usage: 25 },
    });
  });

  it("reports no inode info when the filesystem has none", async () => {
    const fn = vi.fn().mockResolvedValue(fakeStat({ files: 0, ffree: 0 }));
    const result = await statMount("/", false, fn);
    expect(result?.inodes).toBeNull();
  });

  it("falls back to the container path when the host path fails", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("EACCES"), { code: "EACCES" }))
      .mockResolvedValueOnce(fakeStat());
    const result = await statMount("/", true, fn);
    expect(fn.mock.calls.map((c) => c[0])).toEqual(["/proc/1/root/", "/"]);
    expect(result?.mount).toBe("/");
  });

  it("returns null when every target fails", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ENOENT"));
    expect(await statMount("/gone", false, fn)).toBeNull();
  });

  it("gives up on a hung statfs", async () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn().mockReturnValue(new Promise(() => {}));
      const pending = statMount("/nfs", false, fn);
      await vi.advanceTimersByTimeAsync(6_000);
      expect(await pending).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("collectDiskStats", () => {
  it("skips mounts that fail and keeps the rest", async () => {
    const fn = vi.fn(async (target: string) => {
      if (target === "/broken") throw new Error("ENOENT");
      return fakeStat();
    });
    const result = await collectDiskStats(["/", "/broken", "/srv"], false, fn);
    expect(result.map((r) => r.mount)).toEqual(["/", "/srv"]);
  });
});

describe("getDiskStats", () => {
  it("is null when disabled by either flag", async () => {
    vi.stubEnv("DISABLE_DISK_STATS", "true");
    expect(await getDiskStats()).toBeNull();
    vi.stubEnv("DISABLE_DISK_STATS", "");
    vi.stubEnv("DISABLE_SYSTEM_STATS", "true");
    expect(await getDiskStats()).toBeNull();
    expect(statfsMock).not.toHaveBeenCalled();
  });

  it("only touches the root filesystem by default, via fs.statfs", async () => {
    statfsMock.mockResolvedValue(fakeStat() as never);
    const result = await getDiskStats();
    expect(statfsMock).toHaveBeenCalledTimes(1);
    expect(statfsMock).toHaveBeenCalledWith("/");
    expect(result?.[0].mount).toBe("/");
  });

  it("uses the host root when running in docker, no DOCKER env needed", async () => {
    vi.mocked(isDocker).mockResolvedValueOnce(true);
    statfsMock.mockResolvedValue(fakeStat() as never);
    await getDiskStats();
    expect(statfsMock).toHaveBeenCalledWith("/proc/1/root/");
  });

  it("caches results for the TTL regardless of how often it is polled", async () => {
    let now = 1_000;
    const fn = vi.fn().mockResolvedValue(fakeStat());
    await getDiskStats({ now: () => now, statfsFn: fn });
    now += 5_000;
    await getDiskStats({ now: () => now, statfsFn: fn });
    now += DISK_STATS_TTL_MS - 5_001;
    await getDiskStats({ now: () => now, statfsFn: fn });
    expect(fn).toHaveBeenCalledTimes(1);
    now += 2;
    await getDiskStats({ now: () => now, statfsFn: fn });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight lookup between concurrent callers", async () => {
    let release: (v: unknown) => void = () => {};
    const fn = vi.fn(
      () => new Promise((resolve) => (release = resolve))
    ) as never;
    const a = getDiskStats({ statfsFn: fn });
    const b = getDiskStats({ statfsFn: fn });
    await vi.waitFor(() =>
      expect(vi.mocked(fn as () => unknown)).toHaveBeenCalled()
    );
    release(fakeStat());
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toBe(rb);
    expect(vi.mocked(fn as () => unknown)).toHaveBeenCalledTimes(1);
  });

  it("refreshes when DISK_MOUNTS changes", async () => {
    const fn = vi.fn().mockResolvedValue(fakeStat());
    await getDiskStats({ statfsFn: fn });
    vi.stubEnv("DISK_MOUNTS", "/,/mnt/data");
    const result = await getDiskStats({ statfsFn: fn });
    expect(result?.map((r) => r.mount)).toEqual(["/", "/mnt/data"]);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("log noise", () => {
  it("warns about bad config and unreadable mounts once, not on every poll", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("DISK_MOUNTS", "/,relative,/gone");
    let now = 0;
    const fn = vi.fn(async (target: string) => {
      if (target === "/gone") throw new Error("ENOENT");
      return fakeStat();
    });
    for (let i = 0; i < 3; i++) {
      await getDiskStats({ now: () => now, statfsFn: fn });
      now += DISK_STATS_TTL_MS + 1;
    }
    expect(fn).toHaveBeenCalledTimes(6);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes("Ignoring invalid"))).toHaveLength(1);
    expect(messages.filter((m) => m.includes("Unable to read"))).toHaveLength(1);
  });
});

describe("formatting", () => {
  it("formats inode counts compactly", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1_500)).toBe("1.5K");
    expect(formatCount(6_553_600)).toBe("6.6M");
  });

  it("formats disk stats with statuses", () => {
    const [disk] = formatDiskStats(
      [
        {
          mount: "/",
          totalBytes: 100 * GiB,
          usedBytes: 95 * GiB,
          freeBytes: 5 * GiB,
          usage: 95,
          inodes: { total: 2_000, used: 100, free: 1_900, usage: 5 },
        },
      ]
    );
    expect(disk).toEqual({
      mount: "/",
      total: "100.0 GB",
      used: "95.0 GB",
      free: "5.0 GB",
      usage: 95,
      status: "critical",
      inodes: {
        total: "2.0K",
        used: "100",
        free: "1.9K",
        usage: 5,
        status: "optimal",
      },
    });
  });
});
