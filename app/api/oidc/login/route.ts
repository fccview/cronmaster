import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest();
}

export async function GET(request: NextRequest) {
  const ssoMode = process.env.SSO_MODE;
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (ssoMode && ssoMode?.toLowerCase() !== "oidc") {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Login] SSO mode is not oidc");
    }
    return NextResponse.redirect(`${appUrl}/login`);
  }

  let issuer = process.env.OIDC_ISSUER || "";
  if (issuer && !issuer.endsWith("/")) {
    issuer = `${issuer}/`;
  }
  const clientId = process.env.OIDC_CLIENT_ID || "";

  if (!issuer || !clientId) {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Login] Issuer or clientId is not set");
    }
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const discoveryUrl = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;

  try {
    const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });
    if (!discoveryRes.ok) {
      if (process.env.DEBUGGER) {
        console.log(
          "[OIDC Login] Discovery URL is not ok",
          discoveryRes.status
        );
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const discovery = (await discoveryRes.json()) as {
      authorization_endpoint: string;
    };
    const authorizationEndpoint = discovery.authorization_endpoint;

    const verifier = base64UrlEncode(crypto.randomBytes(32));
    const challenge = base64UrlEncode(sha256(verifier));
    const state = base64UrlEncode(crypto.randomBytes(16));
    const nonce = base64UrlEncode(crypto.randomBytes(16));

    const redirectUri = `${appUrl}/api/oidc/callback`;

    const url = new URL(authorizationEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);

    const groupsScope = process.env.OIDC_GROUPS_SCOPE ?? "groups";
    const baseScope = "openid profile email";

    const shouldIncludeGroupsScope =
      groupsScope &&
      groupsScope.toLowerCase() !== "no" &&
      groupsScope.toLowerCase() !== "false";

    if (shouldIncludeGroupsScope) {
      url.searchParams.set("scope", `${baseScope} ${groupsScope}`);
    } else {
      url.searchParams.set("scope", baseScope);
    }

    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);

    if (process.env.DEBUGGER) {
      console.log(
        "[OIDC Login] Redirecting to authorization endpoint:",
        url.toString()
      );
    }

    const response = NextResponse.redirect(url);
    const isSecure =
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true";

    response.cookies.set("oidc_verifier", verifier, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("oidc_state", state, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("oidc_nonce", nonce, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("[OIDC Login] Error:", error);
    return NextResponse.redirect(`${appUrl}/login`);
  }
}
