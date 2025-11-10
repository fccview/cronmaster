#!/bin/bash

# CronMaster Log Wrapper Script
# Captures stdout, stderr, exit code, and timestamps for cronjob executions
# This script is automatically copied to the data directory when logging is enabled
# You can customize it by editing ./data/cron-log-wrapper.sh
#
# Usage: cron-log-wrapper.sh <logFolderName> <command...>
#
# Example: cron-log-wrapper.sh "backup-database_root-0" bash /app/scripts/backup.sh

# Exits if no arguments are provided
if [ $# -lt 2 ]; then
    echo "ERROR: Usage: $0 <logFolderName> <command...>" >&2
    exit 1
fi

# Extracts the log folder name from the first argument
LOG_FOLDER_NAME="$1"
shift  # Remove logFolderName from arguments, rest is the command

# Determines the base directory (Docker vs non-Docker)
if [ -d "/app/data" ]; then
    # Docker environment
    BASE_DIR="/app/data"
else
    # Non-Docker environment - script is in app/_scripts, we need to go up two levels to project root
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
    BASE_DIR="${PROJECT_ROOT}/data"
fi

# Creates the logs directory structure
LOG_DIR="${BASE_DIR}/logs/${LOG_FOLDER_NAME}"
mkdir -p "$LOG_DIR"

# Generates the timestamped log filename
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="${LOG_DIR}/${TIMESTAMP}.log"

# Executes the command and captures the output
{
    echo "=========================================="
    echo "====== CronMaster Job Execution Log ======"
    echo "=========================================="
    echo "Log Folder: ${LOG_FOLDER_NAME}"
    echo "Command: $*"
    echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""

    # Executes the command, capturing the start time
    START_TIME=$(date +%s)
    "$@"
    EXIT_CODE=$?
    END_TIME=$(date +%s)

    # Calculates the duration
    DURATION=$((END_TIME - START_TIME))

    echo ""
    echo "=========================================="
    echo "====== End log - Execution Summary ======="
    echo "=========================================="
    echo "Completed: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Duration: ${DURATION} seconds"
    echo "Exit code: ${EXIT_CODE}"
    echo "=========================================="

    # Exits with the same code as the command
    exit $EXIT_CODE
} >> "$LOG_FILE" 2>&1

# Preserves the exit code for cron
exit $?
