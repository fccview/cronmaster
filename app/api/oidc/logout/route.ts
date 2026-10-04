import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("auth:oidc");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  log.debug("Starting OIDC logout");

  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (process.env.SSO_MODE && process.env.SSO_MODE?.toLowerCase() !== "oidc") {
    log.debug("SSO mode is not oidc, redirecting to login");
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const customLogoutUrl = process.env.OIDC_LOGOUT_URL;
  if (customLogoutUrl) {
    log.debug("Using custom logout URL", { url: customLogoutUrl });
    return NextResponse.redirect(customLogoutUrl);
  }

  const issuer = process.env.OIDC_ISSUER || "";
  if (!issuer) {
    log.warn("OIDC_ISSUER is not set, redirecting to login");
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const discoveryUrl = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;

  log.debug("Discovery URL", { url: discoveryUrl });

  try {
    const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });

    log.debug("Discovery response", { status: discoveryRes.status });

    if (!discoveryRes.ok) {
      log.warn("OIDC discovery failed", {
        status: discoveryRes.status,
        statusText: discoveryRes.statusText,
      });
      return NextResponse.redirect(`${appUrl}/login`);
    }

    let discovery;
    try {
      discovery = (await discoveryRes.json()) as {
        end_session_endpoint?: string;
      };
      log.debug("Discovery parsed", {
        endpoint: discovery.end_session_endpoint,
      });
    } catch (jsonError) {
      log.warn("Failed to parse OIDC discovery JSON", jsonError);
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const endSession = discovery.end_session_endpoint;
    const postLogoutRedirect = `${appUrl}/login`;

    log.debug("End session resolved", {
      endpoint: endSession,
      postLogoutRedirect,
    });

    if (!endSession) {
      log.debug("No end_session_endpoint, redirecting to login");
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const url = new URL(endSession);
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirect);

    log.info("OIDC logout, redirecting to provider end session");
    log.debug("Final redirect URL", { url: url.toString() });

    return NextResponse.redirect(url);
  } catch (error) {
    log.warn("Error during OIDC logout discovery", error);
    return NextResponse.redirect(`${appUrl}/login`);
  }
}
