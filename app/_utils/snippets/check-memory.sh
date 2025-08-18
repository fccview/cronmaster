# @id: check-memory
# @title: Check memory usage
# @description: Alert if memory usage is high
# @category: System Operations
# @tags: memory,monitor,alert

# Check memory usage
# Alert if memory usage is above 90%

MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')

if [ $MEMORY_USAGE -gt 90 ]; then
    echo "Memory usage is ${MEMORY_USAGE}%" | mail -s "Memory Alert" admin@example.com
fi 