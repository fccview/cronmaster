# @id: restart-service
# @title: Restart service
# @description: Restart a system service
# @category: System Operations
# @tags: service,restart,systemd

# Restart service
# Change SERVICE_NAME to your service

SERVICE_NAME="nginx"
systemctl restart "$SERVICE_NAME" 