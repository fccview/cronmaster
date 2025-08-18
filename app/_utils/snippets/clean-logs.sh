# @id: clean-logs
# @title: Clean old log files
# @description: Remove log files older than specified days
# @category: File Operations
# @tags: logs,cleanup,maintenance,rotate

# Clean old log files
# Remove log files older than 30 days

find /var/log -name "*.log" -type f -mtime +30 -delete
find /var/log -name "*.gz" -type f -mtime +30 -delete
find /tmp -name "*.log" -type f -mtime +7 -delete 