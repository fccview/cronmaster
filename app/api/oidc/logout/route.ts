import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.DEBUGGER) {
    console.log("[OIDC Logout] Starting logout process");
  }

  const appUrl = process.env.APP_URL || request.nextUrl.origin;

  if (process.env.SSO_MODE && process.env.SSO_MODE?.toLowerCase() !== "oidc") {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Logout] SSO mode is not oidc, redirecting to login");
    }
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const customLogoutUrl = process.env.OIDC_LOGOUT_URL;
  if (customLogoutUrl) {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Logout] Using custom logout URL", customLogoutUrl);
    }
    return NextResponse.redirect(customLogoutUrl);
  }

  const issuer = process.env.OIDC_ISSUER || "";
  if (!issuer) {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Logout] Issuer is not set, redirecting to login");
    }
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const discoveryUrl = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;

  if (process.env.DEBUGGER) {
    console.log("[OIDC Logout] Discovery URL:", discoveryUrl);
  }

  try {
    const discoveryRes = await fetch(discoveryUrl, { cache: "no-store" });

    if (process.env.DEBUGGER) {
      console.log(
        "[OIDC Logout] Discovery response status:",
        discoveryRes.status
      );
    }

    if (!discoveryRes.ok) {
      if (process.env.DEBUGGER) {
        console.log(
          "[OIDC Logout] Discovery URL is not ok",
          discoveryRes.status,
          discoveryRes.statusText
        );
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    let discovery;
    try {
      discovery = (await discoveryRes.json()) as {
        end_session_endpoint?: string;
      };
      if (process.env.DEBUGGER) {
        console.log("[OIDC Logout] Discovery parsed:", {
          end_session_endpoint: discovery.end_session_endpoint,
        });
      }
    } catch (jsonError) {
      if (process.env.DEBUGGER) {
        console.log("[OIDC Logout] Failed to parse discovery JSON", jsonError);
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const endSession = discovery.end_session_endpoint;
    const postLogoutRedirect = `${appUrl}/login`;

    if (process.env.DEBUGGER) {
      console.log("[OIDC Logout] End session endpoint:", endSession);
      console.log("[OIDC Logout] Post logout redirect:", postLogoutRedirect);
    }

    if (!endSession) {
      if (process.env.DEBUGGER) {
        console.log(
          "[OIDC Logout] No end_session_endpoint, redirecting to login"
        );
      }
      return NextResponse.redirect(`${appUrl}/login`);
    }

    const url = new URL(endSession);
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirect);

    if (process.env.DEBUGGER) {
      console.log("[OIDC Logout] Final redirect URL:", url.toString());
    }

    return NextResponse.redirect(url);
  } catch (error) {
    if (process.env.DEBUGGER) {
      console.log("[OIDC Logout] Error during OIDC discovery", error);
    }
    return NextResponse.redirect(`${appUrl}/login`);
  }
}
