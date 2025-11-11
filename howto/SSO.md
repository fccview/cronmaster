# SSO with OIDC

Cr*nMaster supports any OIDC provider (Authentik, Auth0, Keycloak, Okta, etc.) with these requirements:

- Supports PKCE (most modern providers do)
- Can be configured as a public client (no client secret needed)
- Provides standard OIDC scopes (openid, profile, email)

## Configuration

### 1. Configure your OIDC Provider

- Client Type: Public
- Grant Type: Authorization Code with PKCE
- Scopes: openid, profile, email
- Redirect URI: `https://YOUR_APP_HOST/api/oidc/callback`
- Post-logout URI: `https://YOUR_APP_HOST/login`

### 2. Get these values from your provider

- Client ID
- OIDC Issuer URL (usually ends with `.well-known/openid-configuration`)

### 3. Set environment variables

```yaml
services:
  cronmaster:
    environment:
      - SSO_MODE=oidc
      - OIDC_ISSUER=https://YOUR_SSO_HOST/issuer/path
      - OIDC_CLIENT_ID=your_client_id
      - APP_URL=https://your-cronmaster-domain.com # Required for OIDC, defaults to http://localhost:<port>

      # Optional:
      - OIDC_CLIENT_SECRET=your_client_secret # For confidential client mode (uses client secret instead of PKCE)
      - OIDC_LOGOUT_URL=https://provider.com/logout # Custom logout URL (bypasses discovery)
      - OIDC_GROUPS_SCOPE=groups # Scope for groups claim, set to "no" or "false" to disable
      - INTERNAL_API_URL=http://localhost:3000 # Use if getting 403 errors after login (reverse proxy issues)
      - DEBUGGER=true # Enable detailed OIDC flow logging
      - HTTPS=true # Set if running in production with HTTPS (affects secure cookie flag)
```

**Note**: When `OIDC_CLIENT_SECRET` is set, Cr*nMaster switches to confidential client mode using client authentication instead of PKCE.

### Combining Password and SSO Authentication

You can enable both password-based authentication (`AUTH_PASSWORD`) and OIDC at the same time:

```yaml
environment:
  - AUTH_PASSWORD=your_password
  - SSO_MODE=oidc
  - OIDC_ISSUER=https://your-sso-provider.com
  - OIDC_CLIENT_ID=your_client_id
  - APP_URL=https://your-cronmaster-domain.com
```

When both are enabled, the login page will display:
- Password input field
- SSO button ("Sign in with SSO")

Users can choose either method to authenticate.

## Environment Variables Reference

### Required for OIDC

| Variable | Description |
|----------|-------------|
| `SSO_MODE` | Set to `oidc` to enable SSO authentication |
| `OIDC_ISSUER` | OIDC provider issuer URL (e.g., `https://provider.com` or `https://provider.com/realm`) |
| `OIDC_CLIENT_ID` | Client ID from your OIDC provider |
| `APP_URL` | Public URL of your Cronmaster instance (e.g., `https://cron.domain.com`) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_CLIENT_SECRET` | None | Client secret for confidential client mode |
| `OIDC_LOGOUT_URL` | None | Custom logout URL (skips OIDC discovery for logout) |
| `OIDC_GROUPS_SCOPE` | `groups` | Scope to request groups claim. Set to `no` or `false` to disable |
| `INTERNAL_API_URL` | `APP_URL` | Internal URL for API calls (use if behind reverse proxy with 403 errors) |
| `HTTPS` | `false` | Set to `true` in production with HTTPS (enables `__Host-` cookie prefix and secure flag) |
| `DEBUGGER` | `false` | Enable detailed logging for OIDC flow debugging |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` to allow self-signed certificates (DEV ONLY - UNSAFE in production!) |

## Verified Providers

These providers have been tested:

- **Auth0** - `OIDC_ISSUER=https://YOUR_TENANT.REGION.auth0.com`
- **Authentik** - `OIDC_ISSUER=https://YOUR_DOMAIN/application/o/APP_SLUG/`
- **Keycloak**
- **Okta**

Other standard OIDC providers should work as well.

## How It Works

1. User clicks "Sign in with SSO" button
2. User redirected to OIDC provider's authorization endpoint with:
   - `response_type=code`
   - PKCE challenge (or client secret if configured)
   - `state` and `nonce` for security
   - Requested scopes: `openid profile email` (and groups if enabled)
3. User authenticates with the provider
4. Provider redirects back to `/api/oidc/callback` with authorization code
5. Cr*nMaster exchanges code for ID token using:
   - PKCE verifier (or client secret)
   - Validates `state` matches
6. ID token verified using provider's JWKS (public keys):
   - Issuer validation
   - Audience validation (client ID)
   - Nonce validation
   - Signature verification
7. Secure session created with:
   - Cryptographically random session ID (32 bytes, base64url)
   - Stored in `data/sessions/sessions.json`
   - 30-day expiration
8. Session cookie set:
   - Name: `__Host-cronmaster-session` (production with HTTPS) or `cronmaster-session`
   - HttpOnly, Secure (if HTTPS), SameSite=Lax
9. Session validated on each request via middleware → `/api/auth/check-session`

## Troubleshooting

### 403 Forbidden After SSO Login (Reverse Proxy)

If you successfully authenticate via SSO but get redirected back to login, and your logs show:

```
MIDDLEWARE - Session Check Response:
  status: 403
MIDDLEWARE - session is not ok
```

**Solution**: Set `INTERNAL_API_URL`:

```yaml
environment:
  - INTERNAL_API_URL=http://localhost:3000
```

This tells the middleware to use localhost for session validation instead of going through the reverse proxy.

**Why**: When `APP_URL` is set to your external domain, the middleware tries to validate sessions by calling `https://external-domain.com/api/auth/check-session`, which goes through your reverse proxy and may get blocked with 403.

### Login Redirect Loop

If stuck in a redirect loop:

1. Verify `APP_URL` matches your public URL exactly
2. Check redirect URI in provider matches: `https://YOUR_DOMAIN/api/oidc/callback`
3. Enable `DEBUGGER=true` to see detailed logs
4. Check browser console for errors
5. Verify OIDC provider discovery URL is accessible: `{OIDC_ISSUER}/.well-known/openid-configuration`

### Self-Signed Certificate Error

If you see this error in logs:

```
[OIDC Login] Error: TypeError: fetch failed
cause: Error: self-signed certificate
code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

**Solution for development**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0`:

```yaml
environment:
  - NODE_TLS_REJECT_UNAUTHORIZED=0
```

**⚠️ WARNING**: This disables SSL certificate validation and should ONLY be used in development environments with self-signed certificates. NEVER use this in production!

**Production solution**: Use proper SSL certificates from a trusted CA (Let's Encrypt, etc.)

### 401 Unauthorized After Login

If you authenticate but immediately see login page again:

1. Check cookies are being set (browser dev tools → Application → Cookies)
2. Look for `cronmaster-session` or `__Host-cronmaster-session` cookie
3. Enable `DEBUGGER=true` to see session validation in middleware
4. Check `data/sessions/sessions.json` file exists and has your session
5. Verify file permissions on `data/` directory

### Provider-Specific Errors

**"Invalid client"**
- Client ID or secret is incorrect
- Verify values in provider configuration

**"Invalid redirect URI"**
- Redirect URI doesn't match exactly
- Must include protocol: `https://` not just `domain.com`
- Must match `APP_URL` + `/api/oidc/callback`
- Case-sensitive

**"Invalid scope"**
- Provider doesn't support requested scope
- Try setting `OIDC_GROUPS_SCOPE=no` to disable groups scope
- Some providers (like Google) don't support `groups` scope

**"Nonce mismatch"**
- Browser cookies being blocked or cleared
- Check cookie settings and privacy mode
- May need to adjust SameSite cookie settings

**"JWKS fetch failed"**
- Provider's JWKS endpoint not accessible
- Check firewall/network rules
- Verify OIDC_ISSUER is correct

## Security Notes

- ✅ Sessions valid for 30 days, stored with cryptographically random IDs
- ✅ PKCE used by default (no client secret in authorization URL)
- ✅ ID tokens verified with JWKS (provider's public keys)
- ✅ State parameter prevents CSRF
- ✅ Nonce parameter prevents replay attacks
- ✅ HttpOnly cookies prevent XSS
- ✅ Secure flag on cookies in production with HTTPS
- ✅ `__Host-` cookie prefix in production for additional security
- ✅ Clock tolerance of 5 seconds for token validation

**Production Recommendations:**
- Set `HTTPS=true` when running with HTTPS
- Use `OIDC_CLIENT_SECRET` if provider supports confidential clients (more secure than PKCE)
- Set strong, random `API_KEY` to protect API endpoints
- Use `INTERNAL_API_URL` when behind reverse proxy
- Regularly rotate `OIDC_CLIENT_SECRET` if using confidential client mode

## Debugging

Enable debug mode to see detailed OIDC flow:

```yaml
environment:
  - DEBUGGER=true
```

You'll see logs for:
- `[OIDC Login]` - Authorization redirect
- `[OIDC Callback]` - Token exchange and JWT verification
- `[OIDC Logout]` - Logout flow
- `[Session]` - Session creation/validation/deletion
- `MIDDLEWARE` - Session check and URL resolution

Check both server logs and browser console for complete picture.
