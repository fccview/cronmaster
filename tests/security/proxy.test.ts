import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { buildFrameAncestors } from "@/app/_utils/security-headers";

const SESSION = "super-secret-session-value-1234567890";

const pageRequest = (pathname: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${pathname}`, {
    headers: cookie ? { cookie } : {},
  });

beforeEach(() => {
  vi.stubEnv("AUTH_PASSWORD", "pw");
  vi.stubEnv("SSO_MODE", "");
  vi.stubEnv("FRAME_ANCESTORS", "");
  vi.stubEnv("DEBUGGER", "");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
});

describe("buildFrameAncestors", () => {
  it("is off unless configured", () => {
    expect(buildFrameAncestors(undefined)).toBeNull();
    expect(buildFrameAncestors("   ")).toBeNull();
  });

  it("quotes keywords and keeps hosts", () => {
    expect(buildFrameAncestors("self")).toBe("frame-ancestors 'self'");
    expect(buildFrameAncestors("'none'")).toBe("frame-ancestors 'none'");
    expect(buildFrameAncestors("self, https://dash.example.com")).toBe(
      "frame-ancestors 'self' https://dash.example.com"
    );
  });

  it("drops anything that would break out of the directive", () => {
    expect(buildFrameAncestors("self; script-src *")).toBe("frame-ancestors script-src *");
    expect(buildFrameAncestors("'unsafe-inline'")).toBeNull();
  });
});

describe("proxy", () => {
  it("still redirects anonymous page requests to login", async () => {
    const res = await proxy(pageRequest("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("does not send a frame-ancestors policy by default", async () => {
    const res = await proxy(pageRequest("/", `cronmaster-session=${SESSION}`));
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("adds frame-ancestors to pages when FRAME_ANCESTORS is set", async () => {
    vi.stubEnv("FRAME_ANCESTORS", "self");
    const page = await proxy(pageRequest("/", `cronmaster-session=${SESSION}`));
    expect(page.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");

    const login = await proxy(pageRequest("/login"));
    expect(login.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
  });

  it("never prints the session id or cookies in debug mode", async () => {
    vi.stubEnv("DEBUGGER", "1");
    const spies = (["log", "info", "debug", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {})
    );

    await proxy(pageRequest("/", `cronmaster-session=${SESSION}; other=thing`));

    const printed = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(printed).not.toContain(SESSION);
  });
});
