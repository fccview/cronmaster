#!/bin/bash

# Cr*nmaster Log Wrapper Script
# Captures stdout, stderr, exit code, and timestamps for cronjob executions
#
# Usage: cron-log-wrapper.sh <logFolderName> <command...>
# Example: cron-log-wrapper.sh "backup-database" bash /app/scripts/backup.sh

set -u

if [ $# -lt 2 ]; then
    echo "ERROR: Usage: $0 <logFolderName> <command...>" >&2
    exit 1
fi

LOG_FOLDER_NAME="$1"
shift

# Get the script's absolute directory path (e.g., ./data)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs/${LOG_FOLDER_NAME}"

# Ensure the log directory exists
mkdir -p "$LOG_DIR"

TIMESTAMP_FILE=$(date '+%Y-%m-%d_%H-%M-%S')
HUMAN_START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="${LOG_DIR}/${TIMESTAMP_FILE}.log"
START_SECONDS=$SECONDS

{
    echo "--- [ JOB START ] ----------------------------------------------------"
    echo "Command   : $*"
    echo "Timestamp : ${HUMAN_START_TIME}"
    echo "Host      : $(hostname)"
    echo "User      : $(whoami)"
    echo "--- [ JOB OUTPUT ] ---------------------------------------------------"
    echo ""

    # Execute the command, capturing its exit code
    "$@"
    EXIT_CODE=$?


    DURATION=$((SECONDS - START_SECONDS))
    HUMAN_END_TIME=$(date '+%Y-%m-%d %H:%M:%S')

    if [ $EXIT_CODE -eq 0 ]; then
        STATUS="SUCCESS"
    else
        STATUS="FAILED"
    fi

    echo ""
    echo "--- [ JOB SUMMARY ] --------------------------------------------------"
    echo "Timestamp : ${HUMAN_END_TIME}"
    echo "Duration  : ${DURATION}s"
    # ⚠️ ATTENTION: DO NOT MODIFY THE EXIT CODE LINE ⚠️
    # The UI reads this exact format to detect job failures. Keep it as: "Exit Code : ${EXIT_CODE}"
    echo "Exit Code : ${EXIT_CODE}"
    echo "Status    : ${STATUS}"
    echo "--- [ JOB END ] ------------------------------------------------------"

    exit $EXIT_CODE

} >> "$LOG_FILE" 2>&1

# Pass the command's exit code back to cron
exit $?