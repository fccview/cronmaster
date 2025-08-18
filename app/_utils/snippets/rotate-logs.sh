# @id: rotate-logs
# @title: Rotate log files
# @description: Rotate log files with date suffix
# @category: File Operations
# @tags: logs,rotate,maintenance

# Rotate log files
# Move current logs to dated files

LOG_DIR="/var/log"
DATE=$(date +%Y%m%d)

for log in "$LOG_DIR"/*.log; do
    if [ -f "$log" ]; then
        mv "$log" "${log}.${DATE}"
        touch "$log"
    fi
done 