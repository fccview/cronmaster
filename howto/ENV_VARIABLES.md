# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in CronMaster.

## Core Configuration

### Required Variables

| Variable   | Default | Description                                                                   |
| ---------- | ------- | ----------------------------------------------------------------------------- |
| `NODE_ENV` | `N/A`   | Set to `production` for production deployments, `development` for development |

### Optional Core Variables

| Variable        | Default       | Description                                                                  |
| --------------- | ------------- | ---------------------------------------------------------------------------- |
| `APP_URL`       | Auto-detected | Public URL of your Cronmaster instance (e.g., `https://cron.yourdomain.com`) |
| `LOCALE`        | `en`          | Application locale/language setting (supports custom translations)           |
| `HOME`          | `/home`       | Path to home directory (optional override)                                   |
| `AUTH_PASSWORD` | `N/A`         | Password for authentication (can be used alone or with SSO)                  |

## Custom Translations

CronMaster supports custom user-made translations. You can create your own translation files and use them by setting the `LOCALE` environment variable.

**For detailed instructions on creating custom translations or contributing official translations, see [TRANSLATIONS.md](TRANSLATIONS.md).**

### Quick Setup for Custom Translations

```bash
# Create translations directory
mkdir -p ./data/translations

# Copy template and customize
cp app/_translations/en.json ./data/translations/your-locale.json

# Set locale and restart
export LOCALE=your-locale
```

Translation loading priority:

1. Custom: `./data/translations/{locale}.json`
2. Built-in: `app/_translations/{locale}.json`
3. Fallback: `app/_translations/en.json`

## Docker Configuration

| Variable            | Default | Description                                                                     |
| ------------------- | ------- | ------------------------------------------------------------------------------- |
| `HOST_CRONTAB_USER` | `root`  | Comma-separated list of users whose crontabs to read (e.g., `root,user1,user2`) |

## UI Configuration

| Variable                            | Default | Description                                        |
| ----------------------------------- | ------- | -------------------------------------------------- |
| `NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL` | `30000` | Clock update interval in milliseconds (30 seconds) |
| `LIVE_UPDATES`                      | `true`  | Enable/disable Server-Sent Events for live updates |

## Logging Configuration

| Variable                       | Default | Description                                                      |
| ------------------------------ | ------- | ---------------------------------------------------------------- |
| `MAX_LOG_AGE_DAYS`             | `30`    | Days to keep job execution logs before cleanup                   |
| `NEXT_PUBLIC_MAX_LOG_AGE_DAYS` | `30`    | Days to keep error history in browser localStorage (client-side) |
| `MAX_LOGS_PER_JOB`             | `50`    | Maximum number of log files to keep per job                      |

## Authentication & Security

### Password Authentication

| Variable        | Default | Description                       |
| --------------- | ------- | --------------------------------- |
| `AUTH_PASSWORD` | `N/A`   | Password for basic authentication |

### SSO/OIDC Authentication

| Variable             | Default                 | Description                                                                                                 |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SSO_MODE`           | `N/A`                   | Set to `oidc` to enable OIDC SSO authentication                                                             |
| `APP_URL`            | Auto-detected           | Mandatory when SSO is enabled. Public URL of your Cronmaster instance (e.g., `https://cron.yourdomain.com`) |
| `OIDC_ISSUER`        | `N/A`                   | OIDC provider issuer URL (e.g., `https://auth.yourdomain.com`)                                              |
| `OIDC_CLIENT_ID`     | `N/A`                   | OIDC client ID from your provider                                                                           |
| `OIDC_CLIENT_SECRET` | `N/A`                   | OIDC client secret (optional, for confidential clients)                                                     |
| `OIDC_LOGOUT_URL`    | `N/A`                   | Custom logout URL for OIDC provider                                                                         |
| `OIDC_GROUPS_SCOPE`  | `groups`                | Scope for requesting user groups                                                                            |
| `OIDC_AUTO_REDIRECT` | `false`                 | Automatically redirect to OIDC provider when it's the only authentication method (no password set)          |
| `INTERNAL_API_URL`   | `http://localhost:3000` | Internal API URL override for specific nginx configurations with SSO                                        |

### API Authentication

| Variable  | Default | Description                                    |
| --------- | ------- | ---------------------------------------------- |
| `API_KEY` | `N/A`   | API key for external API access authentication |

## Development & Debugging

| Variable   | Default | Description                                         |
| ---------- | ------- | --------------------------------------------------- |
| `DEBUGGER` | `false` | Enable debug logging and detailed error information |
| `HTTPS`    | `false` | Force HTTPS-only cookies and redirects              |

## System Variables

These are typically set automatically by the system:

| Variable | Default      | Description                                 |
| -------- | ------------ | ------------------------------------------- |
| `USER`   | Current user | Current system user (used in job execution) |

## Docker Compose Examples

### Minimal Configuration

```yaml
services:
  cronmaster:
    image: ghcr.io/fccview/cronmaster:latest
    environment:
      - NODE_ENV=production
      - DOCKER=true
      - AUTH_PASSWORD=your_secure_password
      - HOST_CRONTAB_USER=root
```

### Full Configuration with SSO

```yaml
services:
  cronmaster:
    image: ghcr.io/fccview/cronmaster:latest
    environment:
      - NODE_ENV=production
      - DOCKER=true
      - AUTH_PASSWORD=your_secure_password
      - HOST_CRONTAB_USER=root
      - APP_URL=https://cron.yourdomain.com
      - LOCALE=en 
      - NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL=30000
      - LIVE_UPDATES=true
      - MAX_LOG_AGE_DAYS=30
      - MAX_LOGS_PER_JOB=50
      - SSO_MODE=oidc
      - OIDC_ISSUER=https://auth.yourdomain.com
      - OIDC_CLIENT_ID=your_client_id
      - OIDC_CLIENT_SECRET=your_client_secret
      - OIDC_LOGOUT_URL=https://auth.yourdomain.com/logout
      - OIDC_AUTO_REDIRECT=true 
      - API_KEY=your_api_key
```

## Notes

- All environment variables are case-sensitive
- Boolean variables accept `true`/`false` strings or can be omitted (defaults apply)
- Client-side variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
- SSO variables are only processed when `SSO_MODE=oidc` is present
