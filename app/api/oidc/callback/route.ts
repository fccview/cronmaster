import { NextRequest, NextResponse } from "next/server";
import {
  jwtVerify,
  createRemoteJWKSet,
  decodeJwt,
  type JWTPayload,
} from "jose";
import {
  createSession,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
} from "@/app/_utils/session-utils";
import { createLogger } from "@/app/_utils/logger";
import {
  isOidcAccessRestricted,
  isOidcUserAllowed,
  OIDC_UNAUTHORIZED_MESSAGE,
} from "@/app/_utils/oidc-utils";

const log = createLogger("auth:oidc");

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
    log.warn("OIDC callback with missing or invalid parameters", {
      hasCode: !!code,
      hasState: !!state,
      hasSavedState: !!savedState,
      statesMatch: state === savedState,
      hasVerifier: !!verifier,
    });
    return NextResponse.redirect(`${appUrl}/login`);
  }

  try {
    const discoveryUrl = issuer.endsWith("/")
      ? `${issuer}.well-known/openid-configuration`
      : `${issuer}/.well-known/openid-configuration`;

    const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });
    if (!discoveryRes.ok) {
      log.warn("OIDC discovery failed", { status: discoveryRes.status });
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const discovery = (await discoveryRes.json()) as {
      token_endpoint: string;
      jwks_uri: string;
      issuer: string;
      userinfo_endpoint?: string;
    };
    const tokenEndpoint = discovery.token_endpoint;
    const jwksUri = discovery.jwks_uri;
    const oidcIssuer = discovery.issuer;

    log.debug("OIDC discovery loaded", {
      issuer: oidcIssuer,
      exchangeUrl: tokenEndpoint,
    });

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
      log.warn("OIDC token request failed", { status: tokenRes.status });
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const token = (await tokenRes.json()) as {
      id_token?: string;
      access_token?: string;
    };
    const idToken = token.id_token;
    if (!idToken) {
      log.warn("OIDC token response had no id_token");
      return NextResponse.redirect(`${appUrl}/login`);
    }

    let claims: JWTPayload;
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: oidcIssuer,
        audience: clientId,
        clockTolerance: 5,
      });
      claims = payload;
    } catch (error) {
      log.warn("OIDC id_token validation failed", error);
      return NextResponse.redirect(`${appUrl}/login`);
    }

    if (nonce && claims.nonce && claims.nonce !== nonce) {
      log.warn("OIDC nonce mismatch");
      return NextResponse.redirect(`${appUrl}/login`);
    }

    if (
      isOidcAccessRestricted() &&
      !claims.groups &&
      !claims.roles &&
      discovery.userinfo_endpoint &&
      token.access_token
    ) {
      try {
        const userinfoResponse = await fetch(discovery.userinfo_endpoint, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });

        if (userinfoResponse.ok) {
          const contentType = userinfoResponse.headers.get("content-type") || "";
          const userinfoClaims = contentType.includes("jwt")
            ? decodeJwt(await userinfoResponse.text())
            : ((await userinfoResponse.json()) as JWTPayload);
          claims = { ...userinfoClaims, ...claims };
          log.debug("OIDC groups and roles loaded from userinfo", {
            claimsFetched: Object.keys(userinfoClaims),
          });
        } else {
          log.debug("OIDC userinfo request failed, using id_token claims", {
            status: userinfoResponse.status,
          });
        }
      } catch (error) {
        log.debug("OIDC userinfo request failed, using id_token claims", error);
      }
    }

    if (!isOidcUserAllowed(claims)) {
      log.warn("OIDC login rejected, user not in allowed groups or roles", {
        sub: claims.sub,
        requiredGroups: process.env.OIDC_USER_GROUPS,
        requiredRoles: process.env.OIDC_USER_ROLES,
        userGroups: claims.groups,
        userRoles: claims.roles,
      });
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent(OIDC_UNAUTHORIZED_MESSAGE)}`
      );
    }

    log.info("Login successful", { authType: "oidc", sub: claims.sub });
    log.debug("OIDC claims", {
      sub: claims.sub,
      email: claims.email,
      preferred_username: claims.preferred_username,
    });

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
      maxAge: getSessionMaxAgeSeconds(),
    });

    response.cookies.delete("oidc_verifier");
    response.cookies.delete("oidc_state");
    response.cookies.delete("oidc_nonce");

    return response;
  } catch (error) {
    log.error("OIDC callback failed", error);
    return NextResponse.redirect(`${appUrl}/login`);
  }
}
