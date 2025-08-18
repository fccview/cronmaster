# @id: check-disk-space
# @title: Check disk space
# @description: Alert if disk usage is high
# @category: System Operations
# @tags: disk,space,monitor,alert

# Check disk space
# Alert if disk usage is above 90%

DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $DISK_USAGE -gt 90 ]; then
    echo "Disk usage is ${DISK_USAGE}%" | mail -s "Disk Space Alert" admin@example.com
fi 