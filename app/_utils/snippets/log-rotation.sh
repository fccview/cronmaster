# @id: log-rotation
# @title: Log rotation
# @description: Rotate log files with compression
# @category: System Operations
# @tags: log,rotation,compress,gzip

# Rotate log files
# Change LOG_FILE to your log file path
LOG_FILE="/var/log/your-app.log"
MAX_SIZE="100M"

# Check if log file exists and is larger than max size
if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt $(numfmt --from=iec $MAX_SIZE) ]; then
    echo "Rotating log file: $LOG_FILE"
    
    # Create backup with timestamp
    mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d_%H%M%S)"
    
    # Compress old log
    gzip "${LOG_FILE}.$(date +%Y%m%d_%H%M%S)"
    
    # Create new log file
    touch "$LOG_FILE"
    
    echo "Log rotation completed"
else
    echo "Log file does not need rotation"
fi 