import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";

const host = vi.hoisted(() => ({
  docker: false,
  dataPath: null as string | null,
  scriptsPath: null as string | null,
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: () => true, copyFileSync: vi.fn() };
});

vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn(async () => host.docker),
  getHostDataPath: vi.fn(async () => host.dataPath),
  getHostScriptsPath: vi.fn(async () => host.scriptsPath),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import * as serverWrapper from "@/app/_utils/wrapper-utils";
import * as clientWrapper from "@/app/_utils/wrapper-utils-client";
import { shellQuoteIfNeeded, shellUnquote } from "@/app/_utils/shell-utils";
import { findScriptForCommand } from "@/app/_utils/script-command-utils";
import { parseJobsFromLines } from "@/app/_utils/line-manipulation-utils";
import { getScriptPathForCron } from "@/app/_server/actions/scripts";

const legacyWrap = (wrapperPath: string, jobId: string, command: string) =>
  `${wrapperPath} "${jobId}" sh -c '${command.replace(/'/g, "'\\''")}'`;

const SAFE_PATHS = [
  "/app/data/cron-log-wrapper.sh",
  "/home/fernando/cronmaster/data/cron-log-wrapper.sh",
  "/srv/docker/cron-master_v2.1/data/cron-log-wrapper.sh",
  "/mnt/user/appdata/cronmaster/data/cron-log-wrapper.sh",
  "/volume1/docker/cronmaster@nas/data/cron-log-wrapper.sh",
  "/opt/a+b=c,d%e:f/data/cron-log-wrapper.sh",
];

const EXISTING_WRAPPED_LINES: Array<[string, string, string]> = [
  [
    `/app/data/cron-log-wrapper.sh "a1b2-c3d4" sh -c 'echo hello'`,
    "a1b2-c3d4",
    "echo hello",
  ],
  [
    `/home/fernando/cronmaster/data/cron-log-wrapper.sh "x9y8-z7w6" sh -c 'cd /var/www && php artisan schedule:run >> /dev/null 2>&1'`,
    "x9y8-z7w6",
    "cd /var/www && php artisan schedule:run >> /dev/null 2>&1",
  ],
  [
    `/srv/cronmaster/data/cron-log-wrapper.sh "q1w2-e3r4" sh -c 'echo '\\''it'\\''s quoted'\\'' && date'`,
    "q1w2-e3r4",
    "echo 'it's quoted' && date",
  ],
  [
    `/app/data/cron-log-wrapper.sh "m1n2-b3v4" sh -c 'echo one\necho two\necho three'`,
    "m1n2-b3v4",
    "echo one\necho two\necho three",
  ],
  [
    `/mnt/user/appdata/cronmaster/data/cron-log-wrapper.sh "a1b2c3d4" sh -c 'bash /mnt/user/appdata/cronmaster/scripts/backup.sh'`,
    "a1b2c3d4",
    "bash /mnt/user/appdata/cronmaster/scripts/backup.sh",
  ],
  [
    `/app/data/cron-log-wrapper.sh "z0z0-z0z0" /usr/bin/legacy-unquoted --flag`,
    "z0z0-z0z0",
    "/usr/bin/legacy-unquoted --flag",
  ],
];

const QUOTED_WRAPPED_LINES: Array<[string, string, string]> = [
  [
    `'/mnt/My Drive/cronmaster/data/cron-log-wrapper.sh' "abcd-1234" sh -c 'echo hi'`,
    "abcd-1234",
    "echo hi",
  ],
  [
    `'/srv/it'\\''s here/data/cron-log-wrapper.sh' "abcd-1234" sh -c 'echo one\necho two'`,
    "abcd-1234",
    "echo one\necho two",
  ],
];

beforeEach(() => {
  host.docker = false;
  host.dataPath = null;
  host.scriptsPath = null;
  vi.stubEnv("AUTH_PASSWORD", "");
  vi.stubEnv("SSO_MODE", "");
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("shellQuoteIfNeeded", () => {
  it.each(SAFE_PATHS)("leaves %s byte for byte alone", (value) => {
    expect(shellQuoteIfNeeded(value)).toBe(value);
  });

  it.each([
    ["/mnt/My Drive/x.sh", "'/mnt/My Drive/x.sh'"],
    ["/srv/it's/x.sh", "'/srv/it'\\''s/x.sh'"],
    ["/srv/$HOME/x.sh", "'/srv/$HOME/x.sh'"],
    ["/srv/a;b/x.sh", "'/srv/a;b/x.sh'"],
    ["/srv/(1)/x.sh", "'/srv/(1)/x.sh'"],
  ])("quotes %s", (value, quoted) => {
    expect(shellQuoteIfNeeded(value)).toBe(quoted);
    expect(shellUnquote(quoted)).toBe(value);
  });

  it("unquotes the forms people already have in their crontabs", () => {
    expect(shellUnquote("/plain/path.sh")).toBe("/plain/path.sh");
    expect(shellUnquote(`"/double/quoted.sh"`)).toBe("/double/quoted.sh");
    expect(shellUnquote("'/single/quoted.sh'")).toBe("/single/quoted.sh");
  });
});

describe.each([
  ["wrapper-utils", serverWrapper],
  ["wrapper-utils-client", clientWrapper],
])("%s parsers", (_name, wrapper) => {
  it.each(EXISTING_WRAPPED_LINES)("reads existing line %#", (line, jobId, inner) => {
    expect(wrapper.isCommandWrapped(line)).toBe(true);
    expect(wrapper.extractJobIdFromWrappedCommand(line)).toBe(jobId);
    expect(wrapper.unwrapCommand(line)).toBe(inner);
  });

  it.each(QUOTED_WRAPPED_LINES)("reads quoted line %#", (line, jobId, inner) => {
    expect(wrapper.isCommandWrapped(line)).toBe(true);
    expect(wrapper.extractJobIdFromWrappedCommand(line)).toBe(jobId);
    expect(wrapper.unwrapCommand(line)).toBe(inner);
  });

  it.each([
    "bash /home/user/cronmaster/scripts/backup.sh",
    "/usr/bin/php /var/www/artisan schedule:run >> /dev/null 2>&1",
    "echo cron-log-wrapper.sh",
    "sh -c 'echo hi'",
  ])("leaves unwrapped command %j untouched", (command) => {
    expect(wrapper.isCommandWrapped(command)).toBe(false);
    expect(wrapper.extractJobIdFromWrappedCommand(command)).toBeNull();
    expect(wrapper.unwrapCommand(command)).toBe(command);
  });
});

describe("wrapCommandWithLogger output", () => {
  it("writes native lines exactly as before", async () => {
    const cwd = "/home/fernando/cronmaster";
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    const wrapperPath = path.join(cwd, "data", "cron-log-wrapper.sh");

    for (const command of ["echo hello", "echo 'it's' && date", "echo one\necho two"]) {
      expect(await serverWrapper.wrapCommandWithLogger("a1b2-c3d4", command, false)).toBe(
        legacyWrap(wrapperPath, "a1b2-c3d4", command)
      );
    }
  });

  it.each(SAFE_PATHS.map((p) => path.dirname(p)))(
    "writes docker lines for host data dir %s exactly as before",
    async (dataPath) => {
      host.dataPath = dataPath;
      const line = await serverWrapper.wrapCommandWithLogger("x9y8-z7w6", "echo hi", true);
      expect(line).toBe(legacyWrap(`${dataPath}/cron-log-wrapper.sh`, "x9y8-z7w6", "echo hi"));
    }
  );

  it("quotes host data dirs with spaces and still parses them back", async () => {
    host.dataPath = "/mnt/My Drive/cronmaster/data";
    const line = await serverWrapper.wrapCommandWithLogger("abcd-1234", "echo one\necho two", true);
    expect(line).toBe(
      `'/mnt/My Drive/cronmaster/data/cron-log-wrapper.sh' "abcd-1234" sh -c 'echo one\necho two'`
    );
    expect(clientWrapper.unwrapCommand(line)).toBe("echo one\necho two");
    expect(clientWrapper.extractJobIdFromWrappedCommand(line)).toBe("abcd-1234");
  });

  it.each(EXISTING_WRAPPED_LINES.filter(([line]) => line.includes(" sh -c '")))(
    "re-wrapping an existing line round-trips unchanged %#",
    async (line, jobId) => {
      host.dataPath = path.dirname(line.slice(0, line.indexOf(" ")));
      const rewrapped = await serverWrapper.wrapCommandWithLogger(
        jobId,
        serverWrapper.unwrapCommand(line),
        true
      );
      expect(rewrapped).toBe(line);
    }
  );
});

describe("crontab round trip", () => {
  it("parses a realistic crontab without touching any command", () => {
    const crontab = [
      "# User: root",
      "# nightly backup | id: a1b2-c3d4 | logsEnabled: true",
      `0 3 * * * ${EXISTING_WRAPPED_LINES[0][0]}`,
      "# laravel | id: x9y8-z7w6 | logsEnabled: true",
      `* * * * * ${EXISTING_WRAPPED_LINES[1][0]}`,
      "# script | id: p0o9-i8u7",
      "*/15 * * * * bash /mnt/user/appdata/cronmaster/scripts/backup.sh",
      "# spaced | id: l1k2-j3h4",
      "@daily bash '/mnt/My Drive/cronmaster/scripts/backup.sh'",
      "# PAUSED: old job | id: g5f6-d7s8",
      "# 30 2 * * 0 /usr/bin/certbot renew --quiet",
    ];

    const jobs = parseJobsFromLines(crontab, "root");
    const rendered = jobs.map((job) => `${job.schedule} ${job.command}`);

    expect(rendered).toEqual([
      `0 3 * * * ${EXISTING_WRAPPED_LINES[0][0]}`,
      `* * * * * ${EXISTING_WRAPPED_LINES[1][0]}`,
      "*/15 * * * * bash /mnt/user/appdata/cronmaster/scripts/backup.sh",
      "@daily bash '/mnt/My Drive/cronmaster/scripts/backup.sh'",
      "30 2 * * 0 /usr/bin/certbot renew --quiet",
    ]);
  });
});

describe("script paths for cron", () => {
  const scripts = [{ id: "s1", filename: "backup.sh" }];

  it("writes plain host script paths exactly as before", async () => {
    host.docker = true;
    host.scriptsPath = "/mnt/user/appdata/cronmaster/scripts";
    expect(await getScriptPathForCron("backup.sh")).toBe(
      "bash /mnt/user/appdata/cronmaster/scripts/backup.sh"
    );
  });

  it("writes plain native script paths exactly as before", async () => {
    vi.spyOn(process, "cwd").mockReturnValue("/home/fernando/cronmaster");
    expect(await getScriptPathForCron("backup.sh")).toBe(
      "bash /home/fernando/cronmaster/scripts/backup.sh"
    );
  });

  it("quotes script paths with spaces and still detects the script", async () => {
    host.docker = true;
    host.scriptsPath = "/mnt/My Drive/cronmaster/scripts";
    const command = await getScriptPathForCron("backup.sh");
    expect(command).toBe("bash '/mnt/My Drive/cronmaster/scripts/backup.sh'");
    expect(findScriptForCommand(command, scripts)?.id).toBe("s1");
  });

  it.each([
    "bash /mnt/user/appdata/cronmaster/scripts/backup.sh",
    "bash /Users/me/my apps/scripts/backup.sh",
    `bash "/srv/scripts/backup.sh"`,
    "bash '/mnt/My Drive/scripts/backup.sh'",
    "bash '/srv/it'\\''s/scripts/backup.sh'",
    `/app/data/cron-log-wrapper.sh "a1b2-c3d4" sh -c 'bash /srv/scripts/backup.sh'`,
    `/app/data/cron-log-wrapper.sh "a1b2-c3d4" sh -c 'bash '\\''/mnt/My Drive/scripts/backup.sh'\\'''`,
    `'/mnt/My Drive/data/cron-log-wrapper.sh' "a1b2-c3d4" sh -c 'bash '\\''/mnt/My Drive/scripts/backup.sh'\\'''`,
  ])("detects the script in %j", (command) => {
    expect(findScriptForCommand(command, scripts)?.id).toBe("s1");
  });
});
