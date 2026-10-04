import { beforeEach, describe, expect, it, vi } from "vitest";

const { existsSync, execSync } = vi.hoisted(() => ({
  existsSync: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync };
});

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return { ...actual, execSync };
});

import {
  getHostDataPath,
  getHostScriptsPath,
} from "@/app/_server/actions/global";

const inspectCalls = () =>
  execSync.mock.calls.filter(([cmd]) => String(cmd).startsWith("docker inspect"));

beforeEach(() => {
  existsSync.mockReset();
  execSync.mockReset();
  existsSync.mockImplementation((p: string) => p === "/.dockerenv");
  execSync.mockImplementation((cmd: string) => {
    if (cmd === "hostname") return Buffer.from("abc123\n");
    if (cmd.includes('"/app/data"')) return "/srv/inspected/data\n";
    if (cmd.includes('"/app/scripts"')) return "/srv/inspected/scripts\n";
    return "";
  });
  vi.stubEnv("HOST_DATA_DIR", "");
  vi.stubEnv("HOST_SCRIPTS_DIR", "");
  vi.stubEnv("HOST_PROJECT_DIR", "");
});

describe("host path resolution", () => {
  it("returns null outside Docker even when overrides are set", async () => {
    existsSync.mockReturnValue(false);
    vi.stubEnv("HOST_DATA_DIR", "/srv/cronmaster/data");
    expect(await getHostDataPath()).toBeNull();
    expect(await getHostScriptsPath()).toBeNull();
  });

  it("uses docker inspect by default", async () => {
    expect(await getHostDataPath()).toBe("/srv/inspected/data");
    expect(await getHostScriptsPath()).toBe("/srv/inspected/scripts");
  });

  it("prefers HOST_DATA_DIR and HOST_SCRIPTS_DIR without calling docker inspect", async () => {
    vi.stubEnv("HOST_DATA_DIR", "/mnt/nas/cronmaster/data/");
    vi.stubEnv("HOST_SCRIPTS_DIR", "/mnt/nas/cronmaster/scripts");

    expect(await getHostDataPath()).toBe("/mnt/nas/cronmaster/data");
    expect(await getHostScriptsPath()).toBe("/mnt/nas/cronmaster/scripts");
    expect(inspectCalls()).toHaveLength(0);
  });

  it("ignores relative overrides", async () => {
    vi.stubEnv("HOST_DATA_DIR", "./data");
    expect(await getHostDataPath()).toBe("/srv/inspected/data");
  });

  it("falls back to HOST_PROJECT_DIR when docker inspect finds nothing", async () => {
    execSync.mockImplementation((cmd: string) => {
      if (cmd === "hostname") return Buffer.from("abc123\n");
      throw new Error("Cannot connect to the Docker daemon");
    });
    vi.stubEnv("HOST_PROJECT_DIR", "/home/cronmaster");

    expect(await getHostDataPath()).toBe("/home/cronmaster/data");
    expect(await getHostScriptsPath()).toBe("/home/cronmaster/scripts");
  });

  it("does not let HOST_PROJECT_DIR override a working docker inspect", async () => {
    vi.stubEnv("HOST_PROJECT_DIR", "/stale/path");
    expect(await getHostDataPath()).toBe("/srv/inspected/data");
  });

  it("returns null when nothing can resolve the path", async () => {
    execSync.mockImplementation((cmd: string) => {
      if (cmd === "hostname") return Buffer.from("abc123\n");
      return "\n";
    });
    expect(await getHostDataPath()).toBeNull();
  });
});
