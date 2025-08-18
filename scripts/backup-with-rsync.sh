#!/bin/bash
# Backup source directory to destination
# Change SOURCE_DIR and DEST_DIR to your paths
SOURCE_DIR="/path/to/source"
DEST_DIR="/path/to/backup"

rsync -av --progress --delete \
  --exclude='*.tmp' \
  --exclude='*.log' \
  --exclude='node_modules' \
  "$SOURCE_DIR/" "$DEST_DIR/"

echo "Backup completed at $(date)"