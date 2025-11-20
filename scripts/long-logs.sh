# @id: script_1763663771310_a5dac8gtc
# @title: long-logs
# @description: tests long logs

#!/bin/bash

# Test script for large log output
# Generates 15,000 lines with random strings

echo "Starting large log test - 15,000 lines incoming..."
echo ""

for i in {1..15000}; do
  # Generate random string with timestamp and line number
  random_string=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
  timestamp=$(date '+%Y-%m-%d %H:%M:%S.%3N')

  echo "[$timestamp] Line $i: Processing task_${random_string} - Status: $(( RANDOM % 100 ))% complete"

  # Add occasional error/warning messages
  if [ $((i % 1000)) -eq 0 ]; then
    echo "[$timestamp] [WARNING] Checkpoint reached at line $i"
  fi

  if [ $((i % 5000)) -eq 0 ]; then
    echo "[$timestamp] [INFO] Major milestone: $i lines processed"
  fi

  # Small delay every 100 lines to make it more realistic for live view
  if [ $((i % 100)) -eq 0 ]; then
    sleep 0.01
  fi
done

echo ""
echo "Test complete! Generated 15,000 lines."