# @id: backup-with-rsync
# @title: Backup with rsync
# @description: Creates a backup using rsync

#!/bin/bash
# Backup source directory to destination
# Change SOURCE_DIR and DEST_DIR to your paths
SOURCE_DIR="/path/to/source"
DEST_DIR="/path/to/backuppp"

rsync -av --progress --delete \
  --exclude='*.tmp' \
  --exclude='*.log' \
  --exclude='node_modules' \
  "$SOURCE_DIR/" "$DEST_DIR/"

echo "Backup completed at $(date)"