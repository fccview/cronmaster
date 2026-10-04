import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const idToken = vi.hoisted(() => ({ claims: {} as Record<string, unknown> }));

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => "jwks"),
  jwtVerify: vi.fn(async () => ({ payload: idToken.claims })),
  decodeJwt: vi.fn(() => ({ groups: ["from-jwt-userinfo"] })),
}));

vi.mock("@/app/_utils/session-utils", () => ({
  createSession: vi.fn(async () => "new-session"),
  getSessionCookieName: () => "cronmaster-session",
  getSessionMaxAgeSeconds: () => 2592000,
}));

import { checkClaims, isOidcUserAllowed } from "@/app/_utils/oidc-utils";
import { GET as callback } from "@/app/api/oidc/callback/route";
import { createSession } from "@/app/_utils/session-utils";

let userinfo: Response | null = null;

const callbackRequest = () =>
  new NextRequest("http://localhost/api/oidc/callback?code=c&state=s", {
    headers: { cookie: "oidc_state=s; oidc_verifier=v; oidc_nonce=n" },
  });

beforeEach(() => {
  vi.stubEnv("SSO_MODE", "oidc");
  vi.stubEnv("OIDC_ISSUER", "https://idp.example");
  vi.stubEnv("OIDC_CLIENT_ID", "cronmaster");
  vi.stubEnv("APP_URL", "http://localhost");
  vi.stubEnv("OIDC_USER_GROUPS", "");
  vi.stubEnv("OIDC_USER_ROLES", "");
  idToken.claims = { sub: "u1", nonce: "n" };
  userinfo = null;
  vi.mocked(createSession).mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("openid-configuration")) {
        return Response.json({
          token_endpoint: "https://idp.example/token",
          jwks_uri: "https://idp.example/jwks",
          issuer: "https://idp.example/",
          userinfo_endpoint: "https://idp.example/userinfo",
        });
      }
      if (url.endsWith("/token")) {
        return Response.json({ id_token: "jwt", access_token: "at" });
      }
      if (url.endsWith("/userinfo")) {
        return userinfo ?? new Response("nope", { status: 500 });
      }
      throw new Error(`unexpected fetch ${url}`);
    })
  );
});

describe("checkClaims", () => {
  it("matches arrays and space or comma separated strings like jotty", () => {
    expect(checkClaims("admins, ops", ["ops"])).toBe(true);
    expect(checkClaims("ops", "devs ops")).toBe(true);
    expect(checkClaims("ops", "devs,ops")).toBe(true);
    expect(checkClaims("ops", ["operators"])).toBe(false);
    expect(checkClaims("", ["ops"])).toBe(false);
    expect(checkClaims(undefined, ["ops"])).toBe(false);
    expect(checkClaims("ops", undefined)).toBe(false);
    expect(checkClaims("ops", 42)).toBe(false);
  });

  it("allows everyone when no restriction is configured", () => {
    expect(isOidcUserAllowed({})).toBe(true);
  });
});

describe("OIDC callback access restriction", () => {
  it("lets anyone in when OIDC_USER_GROUPS and OIDC_USER_ROLES are unset", async () => {
    const res = await callback(callbackRequest());
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(createSession).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalledWith("https://idp.example/userinfo", expect.anything());
  });

  it("rejects users outside the allowed groups and roles", async () => {
    vi.stubEnv("OIDC_USER_GROUPS", "cron_admins");
    vi.stubEnv("OIDC_USER_ROLES", "operator");
    idToken.claims = { sub: "u1", nonce: "n", groups: ["users"], roles: ["viewer"] };

    const res = await callback(callbackRequest());
    expect(res.headers.get("location")).toMatch(/^http:\/\/localhost\/login\?error=/);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("accepts a matching group or a matching role", async () => {
    vi.stubEnv("OIDC_USER_GROUPS", "cron_admins");
    idToken.claims = { sub: "u1", nonce: "n", groups: ["users", "cron_admins"] };
    expect((await callback(callbackRequest())).headers.get("location")).toBe("http://localhost/");

    vi.stubEnv("OIDC_USER_GROUPS", "");
    vi.stubEnv("OIDC_USER_ROLES", "operator");
    idToken.claims = { sub: "u1", nonce: "n", roles: "viewer operator" };
    expect((await callback(callbackRequest())).headers.get("location")).toBe("http://localhost/");
  });

  it("falls back to the userinfo endpoint when the id_token has no groups or roles", async () => {
    vi.stubEnv("OIDC_USER_GROUPS", "cron_admins");
    userinfo = Response.json({ groups: ["cron_admins"] });
    const res = await callback(callbackRequest());
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("decodes JWT userinfo responses", async () => {
    vi.stubEnv("OIDC_USER_GROUPS", "from-jwt-userinfo");
    userinfo = new Response("a.b.c", { headers: { "content-type": "application/jwt" } });
    const res = await callback(callbackRequest());
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("stays locked when userinfo fails", async () => {
    vi.stubEnv("OIDC_USER_GROUPS", "cron_admins");
    const res = await callback(callbackRequest());
    expect(res.headers.get("location")).toMatch(/\/login\?error=/);
    expect(createSession).not.toHaveBeenCalled();
  });
});
