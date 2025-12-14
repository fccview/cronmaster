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

### PATCH /api/cronjobs/:id

Update a cron job.

**Parameters:**

- `id` (string) - Cron job ID

**Request:**

```json
{
  "schedule": "0 3 * * *",
  "command": "/usr/bin/echo updated",
  "comment": "Updated job",
  "logsEnabled": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cron job updated successfully"
}
```

**Example:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"schedule":"0 3 * * *","command":"/usr/bin/echo updated"}' \
  https://your-cronmaster-url.com/api/cronjobs/fccview-0
```

---

### DELETE /api/cronjobs/:id

Delete a cron job.

**Parameters:**

- `id` (string) - Cron job ID

**Response:**

```json
{
  "success": true,
  "message": "Cron job deleted successfully"
}
```

**Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/cronjobs/fccview-0
```

---

### GET /api/cronjobs/:id/execute

Manually execute a cron job.

**Parameters:**

- `id` (string) - Cron job ID

**Query Parameters:**

- `runInBackground` (boolean, optional) - Whether to run the job in background. Defaults to `true`.

**Response:**

```json
{
  "success": true,
  "runId": "run-123",
  "message": "Job execution started"
}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/cronjobs/fccview-0/execute?runInBackground=true
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

### GET /api/logs/stream

Stream job execution logs.

**Query Parameters:**

- `runId` (string, required) - The run ID of the job execution
- `offset` (number, optional) - Byte offset for streaming new content. Defaults to `0`.
- `maxLines` (number, optional) - Maximum lines to return. Defaults to `500`, min `100`, max `5000`.

**Note:** When `offset=0`, the endpoint only reads the last `maxLines` from the file for performance. This means `totalLines` is only returned when the file is small enough to read entirely (not truncated).

**Response:**

```json
{
  "status": "running",
  "content": "[log content]",
  "newContent": "[new log content since offset]",
  "logFile": "2025-11-10_14-30-00.log",
  "isComplete": false,
  "exitCode": null,
  "fileSize": 1024,
  "offset": 0,
  "totalLines": 50,
  "displayedLines": 50,
  "truncated": false
}
```

**Response Fields:**

- `status` (string) - Job status: "running", "completed", or "failed"
- `content` (string) - The log content to display
- `newContent` (string) - New content since the last offset (for streaming)
- `logFile` (string) - Name of the log file
- `isComplete` (boolean) - Whether the job has completed
- `exitCode` (number | null) - Exit code of the job (null if still running)
- `fileSize` (number) - Total size of the log file in bytes
- `offset` (number) - Current byte offset
- `totalLines` (number | undefined) - Total number of lines in the file (only returned when file is small enough to read entirely)
- `displayedLines` (number) - Number of lines being displayed
- `truncated` (boolean) - Whether the content is truncated due to maxLines limit

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-cronmaster-url.com/api/logs/stream?runId=run-123&offset=0&maxLines=500"
```

---

### GET /api/system/wrapper-check

Check if the log wrapper script has been modified from the default.

**Response:**

```json
{
  "modified": false
}
```

**Example:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-cronmaster-url.com/api/system/wrapper-check
```

---

### GET /api/oidc/login

Initiate OIDC (SSO) login flow. Redirects to the OIDC provider's authorization endpoint.

**Note:** This endpoint is only available when `SSO_MODE=oidc` is configured.

**Response:** HTTP 302 redirect to OIDC provider

**Example:**

```bash
curl -L https://your-cronmaster-url.com/api/oidc/login
```

---

### GET /api/oidc/callback

OIDC callback endpoint. Handles the authorization code from the OIDC provider and creates a session.

**Note:** This endpoint is typically called by the OIDC provider after authentication, not directly by clients.

**Query Parameters:**

- `code` (string) - Authorization code from OIDC provider
- `state` (string) - State parameter for CSRF protection

**Response:** HTTP 302 redirect to application root

---

### GET /api/oidc/logout

Initiate OIDC logout flow. Redirects to the OIDC provider's logout endpoint.

**Note:** This endpoint is only available when `SSO_MODE=oidc` is configured.

**Response:** HTTP 302 redirect to OIDC provider logout endpoint

**Example:**

```bash
curl -L https://your-cronmaster-url.com/api/oidc/logout
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
