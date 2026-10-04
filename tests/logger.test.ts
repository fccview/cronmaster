import { describe, expect, it, vi } from "vitest";
import { createLogger, formatLine, printBanner, redact, resolveLogLevel } from "@/app/_utils/logger";

describe("logger", () => {
  it("defaults to info", () => {
    vi.stubEnv("LOG_LEVEL", "");
    vi.stubEnv("DEBUGGER", "");
    expect(resolveLogLevel()).toBe("info");
  });

  it("honours LOG_LEVEL and falls back to debug when DEBUGGER is set", () => {
    vi.stubEnv("LOG_LEVEL", "WARN");
    expect(resolveLogLevel()).toBe("warn");
    vi.stubEnv("LOG_LEVEL", "nonsense");
    vi.stubEnv("DEBUGGER", "true");
    expect(resolveLogLevel()).toBe("debug");
  });

  it("drops messages below the configured level", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = createLogger("job");
    log.info("quiet");
    log.warn("loud");
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("[cr*nmaster:job]");
  });

  it("nests scopes with child", () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    createLogger("job").child("exec").debug("hi");
    expect(debug.mock.calls[0][0]).toContain("[cr*nmaster:job:exec]");
  });

  it("emits json when LOG_FORMAT=json", () => {
    vi.stubEnv("LOG_LEVEL", "info");
    vi.stubEnv("LOG_FORMAT", "json");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    createLogger("auth").error("nope", { user: "bob", password: "hunter2" });
    const parsed = JSON.parse(error.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "error",
      scope: "auth",
      message: "nope",
      meta: { user: "bob", password: "[redacted]" },
    });
  });

  it("redacts sensitive keys recursively and serialises errors", () => {
    expect(
      redact({ nested: { apiKey: "x", sessionId: "y", ok: 1 }, list: [{ token: "z" }] })
    ).toEqual({
      nested: { apiKey: "[redacted]", sessionId: "[redacted]", ok: 1 },
      list: [{ token: "[redacted]" }],
    });
    const serialised = redact(new Error("boom")) as { message: string };
    expect(serialised.message).toBe("boom");
  });

  it("logs infoOnce at info the first time and debug afterwards", () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const log = createLogger("system");
    const key = `docker-${Math.random()}`;
    log.infoOnce(key, "Docker detected");
    log.infoOnce(key, "Docker detected");
    expect(info).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledOnce();
    expect(info.mock.calls[0][0]).toContain("[cr*nmaster:system]");
  });

  it("reads NEXT_PUBLIC_LOG_LEVEL when LOG_LEVEL is unset", () => {
    vi.stubEnv("LOG_LEVEL", "");
    vi.stubEnv("DEBUGGER", "");
    vi.stubEnv("NEXT_PUBLIC_LOG_LEVEL", "error");
    expect(resolveLogLevel()).toBe("error");
  });
});

describe("formatLine colours", () => {
  const time = new Date("2026-10-04T12:00:00.000Z");

  it("paints the whole warn line orange", () => {
    vi.stubEnv("NO_COLOR", "");
    expect(formatLine("warn", "auth", "careful", time)).toBe(
      "\x1b[38;5;208m2026-10-04T12:00:00.000Z WARN  [cr*nmaster:auth] careful\x1b[0m"
    );
  });

  it("only colours the label for info", () => {
    vi.stubEnv("NO_COLOR", "");
    expect(formatLine("info", "job", "ran", time)).toBe(
      "2026-10-04T12:00:00.000Z \x1b[36mINFO \x1b[0m [cr*nmaster:job] ran"
    );
  });

  it("respects NO_COLOR", () => {
    vi.stubEnv("NO_COLOR", "1");
    expect(formatLine("error", "job", "boom", time)).toBe(
      "2026-10-04T12:00:00.000Z ERROR [cr*nmaster:job] boom"
    );
  });
});

describe("printBanner", () => {
  it("paints only the asterisk red", () => {
    vi.stubEnv("NO_COLOR", "");
    vi.stubEnv("LOG_FORMAT", "");
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    printBanner();
    const lines = (out.mock.calls[0][0] as string).split("\n");
    expect(lines[4]).toBe(
      "|  |    |  .--'\x1b[31m(__      __)\x1b[0m|      \\|  |'.'|  |' ,-.  |(  .-''-.  .-'| .-. :|  .--'"
    );
  });

  it("stays quiet in json mode and plain with NO_COLOR", () => {
    vi.stubEnv("LOG_FORMAT", "json");
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    printBanner();
    expect(out).not.toHaveBeenCalled();
    vi.stubEnv("LOG_FORMAT", "");
    vi.stubEnv("NO_COLOR", "1");
    printBanner();
    expect(out.mock.calls[0][0]).not.toContain("\x1b[");
  });
});
