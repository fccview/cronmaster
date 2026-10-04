import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, utimes, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { parseExitCode } from "@/app/_utils/log-format-utils";
import {
  findRunLogFile,
  getJobLogDir,
  getLogsBaseDir,
  readLogExitCode,
} from "@/app/_utils/log-files-utils";

const summary = (code: number) =>
  [
    "--- [ JOB SUMMARY ] ---",
    "Duration  : 1s",
    `Exit Code : ${code}`,
    "Status    : DONE",
    "--- [ JOB END ] ---",
    "",
  ].join("\n");

describe("parseExitCode", () => {
  it("reads the wrapper summary line", () => {
    expect(parseExitCode(summary(0))).toBe(0);
    expect(parseExitCode(summary(127))).toBe(127);
  });

  it("returns null while the job is still running", () => {
    expect(parseExitCode("--- [ JOB START ] ---\ntick 1\n")).toBeNull();
  });

  it("trusts the last summary over job output that looks like one", () => {
    const content = `child said\nExit Code : 0\n${summary(3)}`;
    expect(parseExitCode(content)).toBe(3);
  });

  it("ignores exit code text in the middle of a line", () => {
    expect(parseExitCode("echo Exit Code : 0 was printed\n")).toBeNull();
  });

  it("handles CRLF and ansi colours", () => {
    expect(parseExitCode("\x1b[32mExit Code : 2\x1b[0m\r\n")).toBe(2);
  });
});

describe("log file helpers", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cronmaster-exit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("builds job log dirs under the shared logs base", () => {
    expect(getJobLogDir("abcd-1234")).toBe(
      path.join(getLogsBaseDir(), "abcd-1234")
    );
    expect(getLogsBaseDir()).toBe(path.join(process.cwd(), "data", "logs"));
  });

  it("reads the exit code from the tail of a large log", async () => {
    const file = path.join(dir, "big.log");
    await writeFile(file, "x".repeat(20000) + "\n" + summary(1));
    expect(await readLogExitCode(file)).toBe(1);
  });

  it("finds the log written by this run, preferring the cached name", async () => {
    const runStart = new Date();
    const old = new Date(runStart.getTime() - 60 * 60 * 1000);

    await writeFile(path.join(dir, "2000-01-01_00-00-00.log"), summary(0));
    await utimes(path.join(dir, "2000-01-01_00-00-00.log"), old, old);
    expect(await findRunLogFile(dir, runStart)).toBeNull();

    await writeFile(path.join(dir, "2000-01-01_00-00-01.log"), "tick 1\n");
    expect((await findRunLogFile(dir, runStart))?.name).toBe(
      "2000-01-01_00-00-01.log"
    );

    expect(
      (await findRunLogFile(dir, runStart, "2000-01-01_00-00-00.log"))?.name
    ).toBe("2000-01-01_00-00-00.log");
  });

  it("returns null for a missing log dir", async () => {
    expect(
      await findRunLogFile(path.join(dir, "nope"), new Date())
    ).toBeNull();
  });
});
