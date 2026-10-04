# Job Execution Logging

CronMaster includes an optional logging feature that captures detailed execution information for your cronjobs.

## How It Works

When you enable logging for a cronjob, CronMaster automatically wraps your command with a log wrapper script. This wrapper:

- Captures **stdout** and **stderr** output
- Records the **exit code** of your command
- Timestamps the **start and end** of execution
- Calculates **execution duration**
- Stores all this information in organized log files

## Enabling Logs

1. When creating or editing a cronjob, check the "Enable Logging" checkbox
2. The wrapper is automatically added to your crontab entry
3. Jobs run independently - they continue to work even if CronMaster is offline

## Log Storage

Logs are stored in the `./data/logs/` directory, one folder per job, named after the job id. Each run writes one file named after the time the run started (`YYYY-MM-DD_HH-MM-SS.log`, host local time).

Example structure:

```
./data/logs/
├── a1b2c3d4/
│   ├── 2025-11-10_14-30-00.log
│   ├── 2025-11-10_15-30-00.log
│   └── 2025-11-10_16-30-00.log
├── e5f6a7b8/
│   └── 2025-11-10_14-35-00.log
```

Folders from older versions named `{description}_{jobId}/` are still picked up.

Cloning a job with logging enabled gives the clone its own job id, wrapper and log folder.

## Log Format

Each log file includes:

```
--- [ JOB START ] ----------------------------------------------------
Command   : bash /app/scripts/backup.sh
Timestamp : 2025-11-10 14:30:00
Host      : hostname
User      : root
--- [ JOB OUTPUT ] ---------------------------------------------------

[command output here]

--- [ JOB SUMMARY ] --------------------------------------------------
Timestamp : 2025-11-10 14:30:45
Duration  : 45s
Exit Code : 0
Status    : SUCCESS
--- [ JOB END ] ------------------------------------------------------
```

## Automatic Cleanup

Logs are automatically cleaned up to prevent disk space issues:

- **Maximum logs per job**: `MAX_LOGS_PER_JOB` (default 50)
- **Maximum age**: `MAX_LOG_AGE_DAYS` (default 30)
- **Cleanup trigger**: when a job run started from the UI or API finishes, and when a job's logs are read (job list, logs modal). Read-triggered cleanup runs at most once every 5 minutes per job.
- **Method**: logs older than the maximum age are deleted, then the oldest logs beyond the per-job limit

A log's age comes from its filename timestamp. Files without a timestamped name fall back to their modification time. File creation time is never used, because filesystems such as NFS, CIFS and some overlay setups report it as missing, which used to make fresh logs look decades old and get deleted on refresh.

The filename timestamp uses the host's local time. If the container runs in a different timezone, ages can be off by that many hours, which only matters for logs right at the age limit.

## Docker Considerations

- Mount the `./data` directory to persist logs on the host
- The wrapper script location: `./data/cron-log-wrapper.sh`. This will be generated automatically the first time you enable logging.

Enabling logging in Docker requires the host path for the directory mounted at `/app/data`, because the crontab entry runs on the host and must point at the wrapper script there. It is resolved in this order:

1. `HOST_DATA_DIR`, if set (absolute host path)
2. `docker inspect` on the running container, via the Docker socket
3. `HOST_PROJECT_DIR/data`, if `HOST_PROJECT_DIR` is set

If none of these works, the job save fails with an error explaining why and leaves the crontab untouched. Set `HOST_DATA_DIR`, or check Docker socket access and the `/app/data` bind mount, then retry.

## Non-Docker Considerations

- Logs are stored at `./data/logs/` relative to the project directory
- The codebase wrapper script location: `./app/_scripts/cron-log-wrapper.sh`
- The running wrapper script location: `./data/cron-log-wrapper.sh`

## Important Notes

- Logging is **optional** and disabled by default
- Jobs with logging enabled are marked with a blue "Logged" badge in the UI
- Logs are captured for both scheduled runs and manual executions
- Commands with file redirections (>, >>) may conflict with logging
- The crontab stores the **wrapped command**, so jobs run independently of CronMaster

