import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserInfo = vi.fn();
const getUserShell = vi.fn();

vi.mock("@/app/_utils/crontab-utils", () => ({ getUserInfo, getUserShell }));
vi.mock("@/app/_utils/running-jobs-utils", () => ({}));
vi.mock("@/app/_utils/sse-broadcaster", () => ({ sseBroadcaster: {} }));
vi.mock("@/app/_utils/wrapper-utils", () => ({}));
vi.mock("@/app/_utils/log-watcher", () => ({}));

const { buildJobExecutionCommand } = await import(
  "@/app/_utils/job-execution-utils"
);

const job = (user: string, command = "echo hi") => ({
  id: "abc",
  schedule: "* * * * *",
  command,
  user,
});

describe("buildJobExecutionCommand", () => {
  beforeEach(() => {
    vi.stubEnv("EXECUTION_SHELL", "");
    getUserInfo.mockImplementation(async (username: string) => ({
      username,
      uid: 1000,
      gid: 1000,
    }));
    getUserShell.mockResolvedValue("/bin/bash");
  });

  it("runs the raw command natively without su", async () => {
    const command = "echo 'hi' && date";
    expect(await buildJobExecutionCommand(job("root", command), false)).toBe(command);
    expect(getUserInfo).not.toHaveBeenCalled();
    expect(getUserShell).not.toHaveBeenCalled();
  });

  it("keeps the login shell for regular users in docker", async () => {
    expect(await buildJobExecutionCommand(job("alice"), true)).toBe(
      "nsenter -t 1 -m -u -i -n -p su - 'alice' -c 'echo hi'"
    );
    expect(getUserShell).toHaveBeenCalledWith("alice");
  });

  it("switches to /bin/sh for nologin users", async () => {
    getUserShell.mockResolvedValue("/usr/sbin/nologin");
    expect(await buildJobExecutionCommand(job("www-data"), true)).toBe(
      "nsenter -t 1 -m -u -i -n -p su -s '/bin/sh' - 'www-data' -c 'echo hi'"
    );
  });

  it("keeps the old behaviour when the shell lookup fails", async () => {
    getUserShell.mockResolvedValue(null);
    expect(await buildJobExecutionCommand(job("alice"), true)).toBe(
      "nsenter -t 1 -m -u -i -n -p su - 'alice' -c 'echo hi'"
    );
  });

  it("uses EXECUTION_SHELL without looking up the user shell", async () => {
    vi.stubEnv("EXECUTION_SHELL", "/bin/bash");
    expect(await buildJobExecutionCommand(job("svc"), true)).toBe(
      "nsenter -t 1 -m -u -i -n -p su -s '/bin/bash' - 'svc' -c 'echo hi'"
    );
    expect(getUserShell).not.toHaveBeenCalled();
  });

  it("falls back to root when the user cannot be resolved, as before", async () => {
    getUserInfo.mockResolvedValue(null);
    expect(await buildJobExecutionCommand(job("ghost"), true)).toBe(
      "nsenter -t 1 -m -u -i -n -p su - 'root' -c 'echo hi'"
    );
    expect(getUserShell).toHaveBeenCalledWith("root");
  });

  it("quotes hostile commands", async () => {
    const command = "echo '$(id)'; rm -rf \"/\" `x`";
    expect(await buildJobExecutionCommand(job("alice", command), true)).toBe(
      `nsenter -t 1 -m -u -i -n -p su - 'alice' -c 'echo '\\''$(id)'\\''; rm -rf "/" \`x\`'`
    );
  });

  it.each(["-c", "--login", "a b", "a;b c", ""])(
    "refuses to run for unsafe username %j",
    async (user) => {
      await expect(buildJobExecutionCommand(job(user), true)).rejects.toThrow(
        /invalid user/
      );
      expect(getUserInfo).not.toHaveBeenCalled();
    }
  );
});
