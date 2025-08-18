# @id: compress-logs
# @title: Compress old logs
# @description: Compress log files older than 7 days
# @category: File Operations
# @tags: logs,compress,gzip

# Compress old logs
# Compress log files older than 7 days

find /var/log -name "*.log" -type f -mtime +7 -exec gzip {} \; 