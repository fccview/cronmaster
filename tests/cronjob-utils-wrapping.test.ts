import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getHostDataPath: vi.fn(),
  readAllHostCrontabs: vi.fn(),
  writeHostCrontabForUser: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: () => true, copyFileSync: vi.fn() };
});

vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn().mockResolvedValue(true),
  getHostDataPath: mocks.getHostDataPath,
  getHostScriptsPath: vi.fn(),
}));

vi.mock("@/app/_utils/crontab-utils", () => ({
  readAllHostCrontabs: mocks.readAllHostCrontabs,
  writeHostCrontabForUser: mocks.writeHostCrontabForUser,
  getAllTargetUsers: vi.fn().mockResolvedValue(["root"]),
}));

import { addCronJob } from "@/app/_utils/cronjob-utils";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getHostDataPath.mockReset();
  mocks.readAllHostCrontabs.mockReset().mockResolvedValue([]);
  mocks.writeHostCrontabForUser.mockReset().mockResolvedValue(true);
});

describe("addCronJob with logging in Docker", () => {
  it("rejects with the wrapping error and leaves the crontab alone", async () => {
    mocks.getHostDataPath.mockResolvedValue(null);

    await expect(
      addCronJob("* * * * *", "echo hi", "test", "root", true)
    ).rejects.toThrow(/HOST_DATA_DIR/);
    expect(mocks.writeHostCrontabForUser).not.toHaveBeenCalled();
  });

  it("wraps with the resolved host data path", async () => {
    mocks.getHostDataPath.mockResolvedValue("/srv/cronmaster/data");

    await expect(
      addCronJob("* * * * *", "echo hi", "test", "root", true)
    ).resolves.toBe(true);

    const written = mocks.writeHostCrontabForUser.mock.calls[0][1] as string;
    expect(written).toContain("/srv/cronmaster/data/cron-log-wrapper.sh");
  });
});
