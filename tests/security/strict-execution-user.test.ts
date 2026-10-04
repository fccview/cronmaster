import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserInfo = vi.fn();
const getUserShell = vi.fn();

vi.mock("@/app/_utils/crontab-utils", () => ({ getUserInfo, getUserShell }));
vi.mock("@/app/_utils/running-jobs-utils", () => ({}));
vi.mock("@/app/_utils/sse-broadcaster", () => ({ sseBroadcaster: {} }));
vi.mock("@/app/_utils/wrapper-utils", () => ({}));
vi.mock("@/app/_utils/log-watcher", () => ({}));

const { buildJobExecutionCommand, describeJobExecutionError } = await import(
  "@/app/_utils/job-execution-utils"
);

const job = { id: "abcd-1234", schedule: "* * * * *", command: "echo hi", user: "ghost" };

beforeEach(() => {
  vi.stubEnv("EXECUTION_SHELL", "");
  vi.stubEnv("STRICT_EXECUTION_USER", "");
  getUserInfo.mockResolvedValue(null);
  getUserShell.mockResolvedValue("/bin/bash");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("STRICT_EXECUTION_USER", () => {
  it("keeps the root fallback by default", async () => {
    const command = await buildJobExecutionCommand(job, true);
    expect(command).toContain("su - 'root' -c 'echo hi'");
  });

  it("refuses to run as root when enabled and the user is unknown", async () => {
    vi.stubEnv("STRICT_EXECUTION_USER", "true");
    const failure = await buildJobExecutionCommand(job, true).catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(describeJobExecutionError(failure).message).toMatch(
      /Could not resolve user "ghost".*STRICT_EXECUTION_USER/
    );
  });

  it("still runs as the resolved user when enabled", async () => {
    vi.stubEnv("STRICT_EXECUTION_USER", "true");
    getUserInfo.mockResolvedValue({ username: "ghost", uid: 1000, gid: 1000 });
    expect(await buildJobExecutionCommand(job, true)).toContain("su - 'ghost' -c 'echo hi'");
  });

  it("does not affect native mode", async () => {
    vi.stubEnv("STRICT_EXECUTION_USER", "true");
    expect(await buildJobExecutionCommand(job, false)).toBe("echo hi");
  });
});
