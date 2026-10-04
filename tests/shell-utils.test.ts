import { execFileSync } from "child_process";
import { describe, expect, it } from "vitest";
import {
  isNonLoginShell,
  isSafeUsername,
  resolveExecutionShell,
  shellQuote,
} from "@/app/_utils/shell-utils";
import { NSENTER_HOST_CRONTAB, NSENTER_RUN_JOB } from "@/app/_consts/nsenter";
import {
  GET_USER_SHELL,
  ID_G,
  ID_U,
  READ_CRONTAB,
  WRITE_HOST_CRONTAB,
} from "@/app/_consts/commands";

const HOSTILE = [
  "echo 'single' \"double\"",
  "true; touch /tmp/pwned",
  "echo $(id -u) `whoami` ${HOME}",
  "a'\\''b",
  "line1\nline2",
  "'; rm -rf / #",
  "",
];

const argvOf = (stub: string, command: string): string[] => {
  const out = execFileSync(
    "sh",
    ["-c", `${stub}() { printf '%s\\0' "$@"; }; ${command}`],
    { encoding: "utf8" }
  );
  return out.split("\0").slice(0, -1);
};

describe("shellQuote", () => {
  it.each(HOSTILE)("round-trips %j through sh untouched", (value) => {
    expect(argvOf("args", `args ${shellQuote(value)}`)).toEqual([value]);
  });
});

describe("isSafeUsername", () => {
  it("accepts normal and directory style usernames", () => {
    for (const name of ["root", "www-data", "svc_backup", "john.doe", "user$", "jdoe@corp.example", "1000user"]) {
      expect(isSafeUsername(name)).toBe(true);
    }
  });

  it("rejects names su would parse as options or that cannot exist", () => {
    for (const name of ["", "-c", "--help", "a b", "a\nb", "a:b", "../root", "a\tb"]) {
      expect(isSafeUsername(name)).toBe(false);
    }
  });
});

describe("isNonLoginShell", () => {
  it.each([
    ["/usr/sbin/nologin", true],
    ["/sbin/nologin", true],
    ["/bin/false", true],
    ["/usr/bin/true", true],
    ["/bin/bash", false],
    ["/bin/sh", false],
    ["/usr/bin/zsh", false],
  ])("%s -> %s", (shell, expected) => {
    expect(isNonLoginShell(shell)).toBe(expected);
  });
});

describe("resolveExecutionShell", () => {
  it("keeps the login shell when nothing is configured and the user has a real shell", () => {
    expect(resolveExecutionShell("/bin/bash", undefined)).toBeUndefined();
    expect(resolveExecutionShell(null, undefined)).toBeUndefined();
    expect(resolveExecutionShell("", "")).toBeUndefined();
  });

  it("falls back to /bin/sh for nologin style users", () => {
    expect(resolveExecutionShell("/usr/sbin/nologin", undefined)).toBe("/bin/sh");
    expect(resolveExecutionShell("/bin/false", "  ")).toBe("/bin/sh");
  });

  it("always uses EXECUTION_SHELL when it is set", () => {
    expect(resolveExecutionShell("/bin/zsh", "/bin/bash")).toBe("/bin/bash");
    expect(resolveExecutionShell("/usr/sbin/nologin", " /bin/bash ")).toBe("/bin/bash");
  });

  it("reads EXECUTION_SHELL from the environment by default", ({ onTestFinished }) => {
    const previous = process.env.EXECUTION_SHELL;
    process.env.EXECUTION_SHELL = "/bin/dash";
    onTestFinished(() => {
      if (previous === undefined) delete process.env.EXECUTION_SHELL;
      else process.env.EXECUTION_SHELL = previous;
    });
    expect(resolveExecutionShell("/bin/bash")).toBe("/bin/dash");
  });
});

describe("NSENTER_RUN_JOB", () => {
  const prefix = ["-t", "1", "-m", "-u", "-i", "-n", "-p", "su"];

  it("keeps the old su invocation when no shell override is needed", () => {
    expect(NSENTER_RUN_JOB("alice", "echo hi")).toBe(
      "nsenter -t 1 -m -u -i -n -p su - 'alice' -c 'echo hi'"
    );
    expect(argvOf("nsenter", NSENTER_RUN_JOB("alice", "echo hi"))).toEqual([
      ...prefix,
      "-",
      "alice",
      "-c",
      "echo hi",
    ]);
  });

  it("passes -s when a shell is given", () => {
    expect(
      argvOf("nsenter", NSENTER_RUN_JOB("www-data", "echo hi", "/bin/sh"))
    ).toEqual([...prefix, "-s", "/bin/sh", "-", "www-data", "-c", "echo hi"]);
  });

  it.each(HOSTILE)("delivers hostile command %j to su as a single argument", (command) => {
    expect(argvOf("nsenter", NSENTER_RUN_JOB("bob", command, "/bin/sh"))).toEqual([
      ...prefix,
      "-s",
      "/bin/sh",
      "-",
      "bob",
      "-c",
      command,
    ]);
  });

  it("does not let a hostile username or shell escape", () => {
    const user = "x'; touch /tmp/pwned; echo '$(id)";
    const shell = "/bin/sh; reboot";
    expect(argvOf("nsenter", NSENTER_RUN_JOB(user, "id", shell))).toEqual([
      ...prefix,
      "-s",
      shell,
      "-",
      user,
      "-c",
      "id",
    ]);
  });
});

describe("NSENTER_HOST_CRONTAB", () => {
  it.each([
    READ_CRONTAB("root"),
    WRITE_HOST_CRONTAB("Ym9vbQo=", "www-data"),
    'getent passwd | grep ":/home/" | head -1 | cut -d: -f1',
    ...HOSTILE,
  ])("hands %j to the host sh verbatim", (command) => {
    expect(argvOf("nsenter", NSENTER_HOST_CRONTAB(command))).toEqual([
      "-t",
      "1",
      "-m",
      "-u",
      "-i",
      "-n",
      "-p",
      "sh",
      "-c",
      command,
    ]);
  });
});

describe("user scoped host commands", () => {
  const user = "evil$(touch /tmp/pwned)'\";x";

  it("quotes the username for id, getent and crontab", () => {
    expect(argvOf("id", ID_U(user))).toEqual(["-u", user]);
    expect(argvOf("id", ID_G(user))).toEqual(["-g", user]);
    expect(argvOf("crontab", READ_CRONTAB(user))).toEqual(["-l", "-u", user]);
    expect(
      argvOf("getent", GET_USER_SHELL(user).replace(" | cut -d: -f7", ""))
    ).toEqual(["passwd", user]);
  });

  it("still pipes the decoded crontab to the right user", () => {
    const out = execFileSync(
      "sh",
      [
        "-c",
        `crontab() { printf '%s|' "$@"; cat; }; ${WRITE_HOST_CRONTAB(
          Buffer.from("* * * * * echo hi\n").toString("base64"),
          user
        )}`,
      ],
      { encoding: "utf8" }
    );
    expect(out).toBe(`-u|${user}|-|* * * * * echo hi\n`);
  });
});
