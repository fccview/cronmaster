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

Logs are stored in the `./data/logs/` directory with descriptive folder names:

- If a job has a **description/comment**: `{sanitized-description}_{jobId}/`
- If a job has **no description**: `{jobId}/`

Example structure:

```
./data/logs/
├── backup-database_root-0/
│   ├── 2025-11-10_14-30-00.log
│   ├── 2025-11-10_15-30-00.log
│   └── 2025-11-10_16-30-00.log
├── daily-cleanup_root-1/
│   └── 2025-11-10_14-35-00.log
├── root-2/  (no description provided)
│   └── 2025-11-10_14-40-00.log
```

**Note**: Folder names are sanitized to be filesystem-safe (lowercase, alphanumeric with hyphens, max 50 chars for the description part).

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

- **Maximum logs per job**: 50 log files
- **Maximum age**: 30 days
- **Cleanup trigger**: When viewing logs or after manual execution
- **Method**: Oldest logs are deleted first when limits are exceeded

## Docker Considerations

- Mount the `./data` directory to persist logs on the host
- The wrapper script location: `./data/cron-log-wrapper.sh`. This will be generated automatically the first time you enable logging.

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

