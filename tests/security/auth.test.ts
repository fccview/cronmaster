import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessions = vi.hoisted(() => ({ valid: new Set<string>() }));

vi.mock("@/app/_utils/session-utils", () => ({
  getSessionCookieName: () => "cronmaster-session",
  validateSession: vi.fn(async (id: string) => sessions.valid.has(id)),
  createSession: vi.fn(async () => "fresh-session-id"),
}));

vi.mock("@/app/_utils/security-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/_utils/security-utils")>();
  return { ...actual, safeCompare: vi.fn(actual.safeCompare) };
});

import { safeCompare } from "@/app/_utils/security-utils";
import { requireAuth, validateApiKey } from "@/app/_utils/api-auth-utils";
import { POST as login } from "@/app/api/auth/login/route";
import { resetLoginRateLimit } from "@/app/_utils/login-rate-limit";

const apiRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/cronjobs", { headers });

const loginRequest = (password: unknown, ip = "203.0.113.7") =>
  new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ password }),
  });

beforeEach(() => {
  sessions.valid.clear();
  resetLoginRateLimit();
  vi.mocked(safeCompare).mockClear();
});

describe("API key auth", () => {
  it("compares bearer tokens with safeCompare", () => {
    vi.stubEnv("API_KEY", "s3cret-key");
    expect(validateApiKey(apiRequest({ authorization: "Bearer s3cret-key" }))).toBe(true);
    expect(safeCompare).toHaveBeenCalledWith("s3cret-key", "s3cret-key");
    expect(validateApiKey(apiRequest({ authorization: "Bearer s3cret" }))).toBe(false);
    expect(validateApiKey(apiRequest({ authorization: "Bearer s3cret-key-and-more" }))).toBe(false);
    expect(validateApiKey(apiRequest({ authorization: "s3cret-key" }))).toBe(false);
    expect(validateApiKey(apiRequest())).toBe(false);
  });

  it("requireAuth rejects anonymous calls and accepts session or bearer", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    vi.stubEnv("API_KEY", "s3cret-key");
    sessions.valid.add("good-session");

    const anonymous = await requireAuth(apiRequest());
    expect(anonymous?.status).toBe(401);

    const wrongKey = await requireAuth(apiRequest({ authorization: "Bearer nope" }));
    expect(wrongKey?.status).toBe(401);

    expect(await requireAuth(apiRequest({ authorization: "Bearer s3cret-key" }))).toBeNull();
    expect(await requireAuth(apiRequest({ cookie: "cronmaster-session=good-session" }))).toBeNull();
    expect((await requireAuth(apiRequest({ cookie: "cronmaster-session=forged" })))?.status).toBe(401);
  });

  it("stays open when no auth is configured", async () => {
    vi.stubEnv("AUTH_PASSWORD", "");
    vi.stubEnv("API_KEY", "");
    vi.stubEnv("SSO_MODE", "");
    expect(await requireAuth(apiRequest())).toBeNull();
  });
});

describe("password login", () => {
  it("uses a timing-safe comparison and never logs the password", async () => {
    vi.stubEnv("AUTH_PASSWORD", "correct horse");
    vi.stubEnv("LOG_FORMAT", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const bad = await login(loginRequest("wrong guess"));
    expect(bad.status).toBe(401);
    expect(safeCompare).toHaveBeenCalledWith("wrong guess", "correct horse");

    const logged = JSON.stringify([...warn.mock.calls, ...info.mock.calls]);
    expect(logged).not.toContain("wrong guess");
    expect(logged).not.toContain("correct horse");

    const good = await login(loginRequest("correct horse"));
    expect(good.status).toBe(200);
    expect(good.headers.get("set-cookie")).toContain("cronmaster-session=fresh-session-id");
  });

  it("rejects non-string passwords", async () => {
    vi.stubEnv("AUTH_PASSWORD", "12345");
    const res = await login(loginRequest(12345));
    expect(res.status).toBe(401);
  });

  it("does not rate limit unless AUTH_MAX_LOGIN_ATTEMPTS is set", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    vi.stubEnv("AUTH_MAX_LOGIN_ATTEMPTS", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let i = 0; i < 25; i++) {
      expect((await login(loginRequest("nope"))).status).toBe(401);
    }
    expect((await login(loginRequest("pw"))).status).toBe(200);
  });

  it("locks out a client after too many failures when opted in", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    vi.stubEnv("AUTH_MAX_LOGIN_ATTEMPTS", "3");
    vi.stubEnv("AUTH_LOCKOUT_MINUTES", "1");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    for (let i = 0; i < 3; i++) {
      expect((await login(loginRequest("nope"))).status).toBe(401);
    }

    const locked = await login(loginRequest("pw"));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);

    expect((await login(loginRequest("pw", "198.51.100.1"))).status).toBe(200);

    now.mockReturnValue(1_000_000 + 61_000);
    expect((await login(loginRequest("pw"))).status).toBe(200);
  });
});
