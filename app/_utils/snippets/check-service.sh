# @id: check-service
# @title: Check service status
# @description: Check if service is running and restart if not
# @category: System Operations
# @tags: service,check,monitor,restart

# Check service status
# Restart service if not running

SERVICE_NAME="nginx"

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl restart "$SERVICE_NAME"
fi 