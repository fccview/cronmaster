import { describe, expect, it, vi } from "vitest";
import { createLogger, redact, resolveLogLevel } from "@/app/_utils/logger";

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
