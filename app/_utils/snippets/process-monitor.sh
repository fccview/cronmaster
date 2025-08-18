# @id: process-monitor
# @title: Process monitoring
# @description: Monitor a process and restart if needed
# @category: System Operations
# @tags: process,monitor,restart,service

# Monitor and restart process if needed
# Change PROCESS_NAME to your process name
PROCESS_NAME="your-process"
RESTART_CMD="systemctl restart your-service"

if pgrep -x "$PROCESS_NAME" > /dev/null; then
    echo "$PROCESS_NAME is running"
else
    echo "$PROCESS_NAME is not running, restarting..."
    $RESTART_CMD
    
    # Wait a moment and check again
    sleep 5
    if pgrep -x "$PROCESS_NAME" > /dev/null; then
        echo "$PROCESS_NAME restarted successfully"
    else
        echo "Failed to restart $PROCESS_NAME"
        exit 1
    fi
fi 