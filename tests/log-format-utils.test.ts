import { describe, expect, it } from "vitest";
import {
  formatLogLine,
  isSectionLine,
  parseAnsi,
  splitLogLines,
  stripAnsi,
} from "@/app/_utils/log-format-utils";

describe("log-format-utils", () => {
  it("strips ansi escape sequences", () => {
    expect(stripAnsi("\x1b[32mgreen\x1b[0m done\x1b[2K")).toBe("green done");
  });

  it("splits lines, normalises CRLF and drops the trailing newline", () => {
    expect(splitLogLines("a\r\nb\n")).toEqual(["a", "b"]);
    expect(splitLogLines("")).toEqual([]);
    expect(splitLogLines("\n")).toEqual([""]);
  });

  it("maps ansi colours to theme variables and resets them", () => {
    expect(parseAnsi("\x1b[32mok\x1b[0m and \x1b[1;31mbad\x1b[0m")).toEqual([
      { text: "ok", color: "var(--green)" },
      { text: " and " },
      { text: "bad", color: "var(--red)", bold: true },
    ]);
  });

  it("skips extended colour arguments instead of misreading them", () => {
    expect(parseAnsi("\x1b[38;5;32mx\x1b[39my")).toEqual([
      { text: "x" },
      { text: "y" },
    ]);
  });

  it("keeps plain lines and whitespace untouched", () => {
    expect(parseAnsi("  spaced   out  ")).toEqual([{ text: "  spaced   out  " }]);
    expect(parseAnsi("")).toEqual([]);
  });

  it("highlights wrapper section headers", () => {
    const segments = formatLogLine("--- [ JOB START ] ------");
    expect(segments.map((segment) => segment.text).join("")).toBe(
      "--- [ JOB START ] ------"
    );
    expect(segments[1]).toEqual({
      text: "[ JOB START ]",
      tone: "accent",
      bold: true,
    });
  });

  it("detects section lines only for the wrapper banner format", () => {
    expect(isSectionLine("--- [ JOB END ] -----")).toBe(true);
    expect(isSectionLine("--- not a section ---")).toBe(false);
    expect(isSectionLine("[ JOB END ]")).toBe(false);
  });

  it("colours wrapper status and exit code fields", () => {
    expect(formatLogLine("Status    : FAILED")).toEqual([
      { text: "Status    : ", tone: "muted" },
      { text: "FAILED", tone: "error", bold: true },
    ]);
    expect(formatLogLine("Exit Code : 0")[1].tone).toBe("success");
    expect(formatLogLine("Host      : box")[1]).toEqual({
      text: "box",
      tone: undefined,
      bold: false,
    });
  });
});
