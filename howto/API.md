# Cr\*nMaster API

REST API for managing cron jobs and system monitoring.

## Authentication

The API supports two authentication methods:

### 1. API Key (Recommended)

Set the `API_KEY` environment variable and include it as a Bearer token:

```bash
Authorization: Bearer YOUR_API_KEY
```

**Note:** If no `API_KEY` is set, the API is publicly accessible (for development).

### 2. Session Cookies

Login with password to get a session cookie, then use it for subsequent requests:

1. **Login:**

```bash
curl -X POST https://your-cronmaster-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'
```

2. **Use session cookie:**

```bash
curl -b cookies.txt https://your-cronmaster-url.com/api/cronjobs
```

**Note:** Session cookies are HTTP-only and expire automatically.

**All API endpoints work with either authentication method.**

## Endpoints

### GET /api/cronjobs

List all cron jobs.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "fccview-0",
      "schedule": "0 2 * * *",
      "command": "/usr/bin/echo hello",
      "comment": "Test job",
      "user": "fccview",
      "logsEnabled": false,
      "isPaused": false
    }
  ]
}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/cronjobs
```

---

### GET /api/cronjobs/:id

Get details for a specific cron job.

**Parameters:**

- `id` (string) - Cron job ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "fccview-0",
    "schedule": "0 2 * * *",
    "command": "/usr/bin/echo hello",
    "comment": "Test job",
    "user": "fccview",
    "logsEnabled": false,
    "isPaused": false
  }
}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/cronjobs/fccview-0
```

---

### GET /api/scripts

List all scripts.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "script-123",
      "filename": "backup.sh",
      "name": "Backup Script",
      "content": "#!/bin/bash\necho 'backup'",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/scripts
```

---

### GET /api/system-stats

Get system statistics.

**Response:**

```json
{
  "uptime": "2 days, 4 hours",
  "memory": {
    "total": "16.0 GB",
    "used": "4.2 GB",
    "free": "11.8 GB",
    "usage": 26,
    "status": "Normal"
  },
  "cpu": {
    "model": "AMD Ryzen 7",
    "cores": 8,
    "usage": 15,
    "status": "Normal"
  },
  "network": {
    "speed": "1000 Mbps",
    "latency": "1ms",
    "status": "Connected"
  }
}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/system-stats
```

---

### GET /api/events

Server-Sent Events stream for real-time updates.

**Response:** SSE stream with events like:

```
event: job-completed
data: {"runId":"run-123","cronJobId":"fccview-0","exitCode":0}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Accept: text/event-stream" \
  https://your-cronmaster-url.com/api/events
```

---

### POST /api/auth/login

Login with password (alternative to API key).

**Request:**

```json
{
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful"
}
```

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}' \
  https://your-cronmaster-url.com/api/auth/login
```

---

### GET /api/auth/check-session

Check if current session is valid (requires login first).

**Response:**

```json
{
  "valid": true
}
```

---

### POST /api/auth/logout

Logout and clear session (requires login first).

**Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Error Responses

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required. Use session cookie or API key (Bearer token)."
}
```

## Testing

For local testing I have made a node script that checks all available endpoints:

```bash
AUTH_PASSWORD=your-password node test-api.js https://your-cronmaster-url.com
```
