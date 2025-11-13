import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";
import {
  createSession,
  getSessionCookieName,
} from "@/app/_utils/session-utils";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (process.env.SSO_MODE !== "oidc") {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  let issuer = process.env.OIDC_ISSUER || "";
  if (issuer && !issuer.endsWith("/")) {
    issuer = `${issuer}/`;
  }
  const clientId = process.env.OIDC_CLIENT_ID || "";
  if (!issuer || !clientId) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("oidc_state")?.value;
  const verifier = request.cookies.get("oidc_verifier")?.value;
  const nonce = request.cookies.get("oidc_nonce")?.value;

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Callback] Missing or invalid parameters", {
        hasCode: !!code,
        hasState: !!state,
        hasSavedState: !!savedState,
        statesMatch: state === savedState,
        hasVerifier: !!verifier,
      });
    }
    return NextResponse.redirect(`${appUrl}/login`);
  }

  try {
    const discoveryUrl = issuer.endsWith("/")
      ? `${issuer}.well-known/openid-configuration`
      : `${issuer}/.well-known/openid-configuration`;

    const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });
    if (!discoveryRes.ok) {
      if (process.env.DEBUGGER) {
        console.log("[OIDC Callback] Discovery failed");
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const discovery = (await discoveryRes.json()) as {
      token_endpoint: string;
      jwks_uri: string;
      issuer: string;
    };
    const tokenEndpoint = discovery.token_endpoint;
    const jwksUri = discovery.jwks_uri;
    const oidcIssuer = discovery.issuer;

    const JWKS = createRemoteJWKSet(new URL(jwksUri));

    const redirectUri = `${appUrl}/api/oidc/callback`;
    const clientSecret = process.env.OIDC_CLIENT_SECRET;
    const body = new URLSearchParams();

    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", redirectUri);
    body.set("client_id", clientId);
    body.set("code_verifier", verifier);

    if (clientSecret) {
      body.set("client_secret", clientSecret);
    }

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!tokenRes.ok) {
      if (process.env.DEBUGGER) {
        console.log("[OIDC Callback] Token request failed:", tokenRes.status);
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const token = (await tokenRes.json()) as { id_token?: string };
    const idToken = token.id_token;
    if (!idToken) {
      if (process.env.DEBUGGER) {
        console.log("[OIDC Callback] No id_token in response");
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    let claims: { [key: string]: any };
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: oidcIssuer,
        audience: clientId,
        clockTolerance: 5,
      });
      claims = payload;
    } catch (error) {
      console.error("[OIDC Callback] ID Token validation failed:", error);
      return NextResponse.redirect(`${appUrl}/login`);
    }

    if (nonce && claims.nonce && claims.nonce !== nonce) {
      if (process.env.DEBUGGER) {
        console.log("[OIDC Callback] Nonce mismatch");
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    if (process.env.DEBUGGER) {
      console.log("[OIDC Callback] Successfully authenticated user:", {
        sub: claims.sub,
        email: claims.email,
        preferred_username: claims.preferred_username,
      });
    }

    const sessionId = await createSession("oidc");

    const response = NextResponse.redirect(`${appUrl}/`);
    const cookieName = getSessionCookieName();
    const isSecure =
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true";

    response.cookies.set(cookieName, sessionId, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.delete("oidc_verifier");
    response.cookies.delete("oidc_state");
    response.cookies.delete("oidc_nonce");

    return response;
  } catch (error) {
    console.error("[OIDC Callback] Error:", error);
    return NextResponse.redirect(`${appUrl}/login`);
  }
}
