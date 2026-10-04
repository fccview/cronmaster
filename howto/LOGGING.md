# System Logging

Cronmaster writes its own operational logs (what the app is doing) to stdout and stderr. These are different from job execution logs, which capture the output of your cron jobs and are covered in [LOGS.md](LOGS.md).

If you run Cronmaster in Docker, read these with `docker logs <container>` or `docker compose logs -f cronmaster`.

## Configuration

| Variable                | Default | Description                                                                                     |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`             | `info`  | Server log level: `error`, `warn`, `info` or `debug`                                            |
| `NEXT_PUBLIC_LOG_LEVEL` | `info`  | Browser console log level. Also used on the server when `LOG_LEVEL` is not set. Build-time value |
| `LOG_FORMAT`            | `text`  | Set to `json` for one JSON object per line, handy for Loki, Elastic, Datadog and friends        |
| `DEBUGGER`              | `false` | Legacy switch. When set and `LOG_LEVEL` is not, the level becomes `debug`                       |

Levels are cumulative: `warn` includes `error`, `info` includes `warn` and `error`, `debug` includes everything.

`NEXT_PUBLIC_LOG_LEVEL` is inlined into the browser bundle when the app is built, so changing it on a prebuilt image only affects the server side. The browser falls back to `info` when it is not set at build time.

### Docker compose example

```yaml
services:
  cronmaster:
    environment:
      - LOG_LEVEL=debug
      - LOG_FORMAT=json
```

## Output format

Text (default):

```
2026-10-04T12:00:00.000Z INFO  [cr*nmaster:job] Job created { user: 'root', schedule: '*/5 * * * *', logsEnabled: true }
2026-10-04T12:00:05.000Z WARN  [cr*nmaster:auth] Login failed, invalid password { ip: '10.0.0.4' }
```

JSON (`LOG_FORMAT=json`):

```json
{"time":"2026-10-04T12:00:00.000Z","level":"info","scope":"job","message":"Job created","meta":{"user":"root","schedule":"*/5 * * * *","logsEnabled":true}}
```

Every line carries a scope tag such as `[cr*nmaster:job:exec]`, so you can grep for one area of the app.

## What gets logged at each level

### error

Things that broke and need attention: failed crontab reads or writes, failed job execution, unreadable backups, failed log stream reads, unexpected exceptions in API routes and OIDC flows.

### warn

Things that went wrong but were handled: failed password logins, OIDC callback rejections (bad state, nonce mismatch, failed token exchange), API requests with an invalid bearer key, jobs or scripts that were not found, jobs that finished with a non-zero exit code, missing OIDC configuration, translation fallbacks.

### info

The audit trail of what happened, without command bodies or crontab contents:

- Startup summary: environment, log level, Docker detection, which auth methods are enabled (booleans only, never the values)
- Job create, update, delete, pause, resume, clone, logging toggle, manual runs (job id and user)
- Job execution start and finish with exit code and duration
- Backup create, restore and delete
- Script create, update, clone and delete
- Log cleanup with how many files were removed
- Login success, logout, session expiry, session rejected by the proxy
- Docker detection and host path resolution, logged once at info and then at debug
- Wrapper script installation and the log watcher starting

### debug

Everything needed to trace a problem:

- Crontab reads and writes per user, with sizes but not contents
- Full job commands at create, update and run time
- Target user detection, container id, wrapper paths
- OIDC flow steps (discovery, redirect endpoints, claims summary)
- Proxy session checks (cookie names and response status, never cookie values)
- SSE connections opening and closing, broadcasts, heartbeat failures
- Running job tracking, log file discovery, individual log file deletions

## Redaction

Metadata keys that look sensitive are replaced with `[redacted]`. This covers any key matching `password`, `secret`, `token`, `cookie`, `authorization`, `apiKey`/`api_key` or `session`. Redaction applies to metadata keys only, so the code never puts secrets into message strings.

Failed shell commands are logged with their exit code and stderr only, because the command line itself can contain the full crontab.

## Scopes

| Scope          | Area                                                       |
| -------------- | ---------------------------------------------------------- |
| `system`       | Startup summary, Docker detection, host path resolution    |
| `proxy`        | Request proxy session checks                               |
| `auth`         | Password login and logout                                  |
| `auth:session` | Session creation, expiry and cleanup                       |
| `auth:api`     | API key and session checks on API routes                   |
| `auth:oidc`    | OIDC login, callback and logout                            |
| `job`          | Job create, update, delete, pause, resume, clone, run      |
| `job:exec`     | Job process execution, exit codes, durations               |
| `job:running`  | Running job tracking                                       |
| `crontab`      | Reading and writing crontabs, target user detection        |
| `wrapper`      | Logging wrapper install, command wrapping, old log pruning |
| `logs`         | Job log listing, deletion and retention cleanup            |
| `logs:stream`  | Live log streaming endpoint                                |
| `logs:watcher` | Log directory watcher used for live updates                |
| `sse`          | Server-sent events connections and broadcasts              |
| `backup`       | Job backups                                                |
| `scripts`      | Script library                                             |
| `snippets`     | Bash snippets                                              |
| `i18n`         | Translations                                               |
| `api:cronjobs` | REST API for cron jobs                                     |
| `api:scripts`  | REST API for scripts                                       |
| `api:system`   | System stats and wrapper check endpoints                   |
| `ui:*`         | Browser side logs (`ui:jobs`, `ui:logs`, `ui:scripts`, `ui:sse`, `ui:system`, `ui:users`, `ui:auth`) |

## For contributors

Use the shared logger instead of `console.*`. A test fails if a `console.` call shows up anywhere in `app/` or `proxy.ts`.

```ts
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("job");

log.info("Job paused", { jobId, user });
log.debug("Job command", { jobId, command });
```

- Pick a scope from the table above. New scopes must start with one of the existing roots (`job`, `logs`, `ui`, ...), the same test checks that too. Sub-scopes like `system:disk` are fine.
- Put variable data in the metadata object, not in the message, so it can be redacted and queried.
- Never log crontab contents or job commands at `info` or above.
- Use `log.infoOnce(key, message, meta)` for facts that only matter the first time, like detection results.
