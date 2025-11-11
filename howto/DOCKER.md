# Docker Configuration Guide

This guide covers all available configuration options for running CronMaster in Docker using Docker Compose.

## Basic Configuration

### Service Definition

```yaml
services:
  cronmaster:
    image: ghcr.io/fccview/cronmaster:latest
    container_name: cronmaster
    user: "root"
```

- **image**: The Docker image to use (latest version recommended)
- **container_name**: Name of the container instance
- **user**: User to run the container as (must be root for crontab access)

### Port Configuration

```yaml
ports:
  - "40123:3000" # Host port : Container port
```

- Default port 3000 inside container
- Map to any available host port (40123 shown as example)

## Environment Variables

### Required Environment Variables

```yaml
environment:
  - NODE_ENV=production
  - DOCKER=true
  - NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL=30000
  - AUTH_PASSWORD=very_strong_password
  - HOST_CRONTAB_USER=root
```

- **NODE_ENV**: Set to `production` for production deployments
- **DOCKER**: Must be `true` when running in Docker
- **NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL**: Clock update interval in milliseconds (default: 30000)
- **AUTH_PASSWORD**: Strong password for authentication
- **HOST_CRONTAB_USER**: User whose crontab to read (default: root, can be comma-separated for multiple users)

### Optional Environment Variables

#### Localization

```yaml
- LOCALE=en # or other supported locales (see /app/_translations/)
```

#### Logging Configuration

```yaml
- MAX_LOG_AGE_DAYS=30 # Days to keep logs (default: 30)
- MAX_LOGS_PER_JOB=50 # Maximum logs per job (default: 50)
```

#### SSO Authentication (OIDC)

```yaml
- SSO_MODE=oidc
- OIDC_ISSUER=https://your-sso-provider.com
- OIDC_CLIENT_ID=your_client_id
- APP_URL=https://your-cronmaster-domain.com
# Optional SSO settings:
- OIDC_CLIENT_SECRET=your_secret
- OIDC_LOGOUT_URL=https://provider/logout
- OIDC_GROUPS_SCOPE=groups
- NODE_TLS_REJECT_UNAUTHORIZED=0 # For self-signed certificates
```

See `README_SSO.md` for detailed SSO setup instructions.

#### API Key Protection

```yaml
- API_KEY=your-secret-api-key-here
```

See `README_API.md` for API key usage instructions.

#### Live Updates

```yaml
- LIVE_UPDATES=false # Set to false to disable Server-Sent Events
```

## Volume Mounts

### Required Volumes

```yaml
volumes:
  # Docker socket for command execution
  - /var/run/docker.sock:/var/run/docker.sock

  # Data persistence
  - ./scripts:/app/scripts
  - ./data:/app/data
  - ./snippets:/app/snippets
```

- **Docker socket**: Required for executing commands on the host
- **./scripts**: Directory for custom scripts created via the app
- **./data**: Application data directory
- **./snippets**: Code snippets directory

### Optional Host Data Mounts

If you want to keep data on the host machine instead of Docker volumes:

```yaml
- ./scripts:/app/scripts
- ./data:/app/data
- ./snippets:/app/snippets
```

**Note**: Do not change the container paths - the application expects these specific locations.

## Container Configuration

### Runtime Configuration

```yaml
pid: "host" # Use host PID namespace for command execution
privileged: true # Required for nsenter access
restart: always # Always restart container
init: true # Use init process
```

### Platform Configuration

```yaml
platform: linux/arm64 # For ARM64 systems (default: linux/amd64)
```

## Complete Example

Here's a complete example with all optional configurations:

```yaml
services:
  cronmaster:
    image: ghcr.io/fccview/cronmaster:latest
    container_name: cronmaster
    user: "root"
    ports:
      - "40123:3000"
    environment:
      - NODE_ENV=production
      - DOCKER=true
      - NEXT_PUBLIC_CLOCK_UPDATE_INTERVAL=30000

      # Localization
      - LOCALE=en

      # Logging
      - MAX_LOG_AGE_DAYS=30
      - MAX_LOGS_PER_JOB=50

      # Authentication
      - AUTH_PASSWORD=very_strong_password

      # SSO (optional)
      - SSO_MODE=oidc
      - OIDC_ISSUER=https://your-sso-provider.com
      - OIDC_CLIENT_ID=your_client_id
      - APP_URL=https://your-cronmaster-domain.com
      - OIDC_CLIENT_SECRET=your_secret
      - OIDC_LOGOUT_URL=https://provider/logout
      - OIDC_GROUPS_SCOPE=groups

      # API Key (optional)
      - API_KEY=your-secret-api-key-here

      # Live Updates
      - LIVE_UPDATES=true

      # Crontab Users
      - HOST_CRONTAB_USER=root
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./scripts:/app/scripts
      - ./data:/app/data
      - ./snippets:/app/snippets
    pid: "host"
    privileged: true
    restart: always
    init: true
    platform: linux/amd64
```

## Security Considerations

- The container runs as root and requires privileged access for crontab management
- The Docker socket is mounted for command execution capabilities
- Choose strong passwords for authentication
- Consider using SSO for enhanced security in production environments

## Troubleshooting

- Ensure Docker socket is accessible: `ls -la /var/run/docker.sock`
- Check crontab user exists: `ls -asl /var/spool/cron/crontabs/`
- Verify port 40123 (or your chosen port) is available
- Check container logs: `docker logs cronmaster`
